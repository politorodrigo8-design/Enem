#!/usr/bin/env python3
"""Create controlled editorial batches toward the 300-question target.

This script is intentionally conservative. It can prepare and audit batches of
up to 50 questions, but it does not mark questions as approved automatically.
Approval remains blocked until human/editorial review supplies resolution,
classification confirmation, and media verification when needed.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_PREVIEW = ROOT / "outputs" / "enem-pilot-2026-07-14" / "questions-preview.json"
DEFAULT_PILOT_SELECTION = ROOT / "outputs" / "enem-pilot-2026-07-14" / "selected-pilot-questions.json"
DEFAULT_OUTPUT_ROOT = ROOT / "outputs" / "enem-editorial-300"

TARGETS = {
    "Matematica": 100,
    "Ciencias da Natureza": 80,
    "Ciencias Humanas": 60,
    "Linguagens": 60,
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-number", type=int, required=True)
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("--source-preview", default=str(DEFAULT_SOURCE_PREVIEW))
    parser.add_argument("--pilot-selection", default=str(DEFAULT_PILOT_SELECTION))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    args = parser.parse_args()

    if args.batch_size > 50:
        raise SystemExit("Cada lote deve ter no maximo 50 questoes.")
    if args.batch_size <= 0:
        raise SystemExit("batch-size precisa ser positivo.")

    source_preview = Path(args.source_preview).resolve()
    pilot_selection = Path(args.pilot_selection).resolve()
    output_root = Path(args.output_root).resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    questions = read_questions(source_preview)
    selected = select_batch_questions(
        questions=questions,
        batch_number=args.batch_number,
        batch_size=args.batch_size,
        pilot_selection=pilot_selection,
        output_root=output_root,
    )
    batch = build_batch(args.batch_number, selected)
    batch_dir = output_root / f"batch-{args.batch_number:03d}"
    batch_dir.mkdir(parents=True, exist_ok=True)
    write_json(batch_dir / "questions.json", {"questions": batch["questions"]})
    write_json(batch_dir / "summary.json", batch["summary"])
    write_text(batch_dir / "preview.md", render_batch_md(batch))

    consolidated = build_consolidated_report(output_root)
    write_json(output_root / "consolidated-report.json", consolidated)
    write_text(output_root / "consolidated-report.md", render_consolidated_md(consolidated))

    print(f"Batch {args.batch_number:03d}: {len(batch['questions'])} questoes")
    print(f"Aprovadas: {batch['summary']['approved']}")
    print(f"Pendentes: {batch['summary']['pending']}")
    print(f"Rejeitadas: {batch['summary']['rejected']}")
    print(f"Output: {batch_dir}")
    return 0


def read_questions(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    questions = data.get("questions", data if isinstance(data, list) else [])
    if not isinstance(questions, list):
        raise SystemExit(f"Arquivo de questoes invalido: {path}")
    return questions


def select_batch_questions(
    questions: list[dict[str, Any]],
    batch_number: int,
    batch_size: int,
    pilot_selection: Path,
    output_root: Path,
) -> list[dict[str, Any]]:
    if batch_number == 1 and pilot_selection.exists():
        return read_questions(pilot_selection)[:batch_size]

    used = load_used_keys(output_root)
    candidates = [
        q
        for q in questions
        if question_key(q) not in used
        and is_batch_candidate(q)
    ]

    approved_counts = load_approved_counts(output_root)
    candidates.sort(
        key=lambda q: (
            approved_counts.get(q.get("area") or "", 0) >= TARGETS.get(q.get("area") or "", 0),
            area_pressure(q, approved_counts),
            -(q.get("priority_score") or 0),
            -(q.get("year") or 0),
            int(q.get("question_number") or 0),
        )
    )

    selected: list[dict[str, Any]] = []
    area_counts: Counter[str] = Counter()
    for question in candidates:
        area = question.get("area") or ""
        if area_counts[area] >= area_quota_for_batch(area, batch_size):
            continue
        selected.append(question)
        area_counts[area] += 1
        if len(selected) == batch_size:
            break

    if len(selected) < batch_size:
        selected_keys = {question_key(q) for q in selected}
        for question in candidates:
            if question_key(question) in selected_keys:
                continue
            selected.append(question)
            if len(selected) == batch_size:
                break

    return selected


def is_batch_candidate(question: dict[str, Any]) -> bool:
    return bool(
        question.get("source_verified")
        and question.get("answer_verified")
        and question.get("review_status") == "pending"
        and question.get("extraction_complete")
        and not question.get("duplicate")
        and not question.get("is_annulled")
        and not question.get("extraction_has_noise")
        and question.get("correct_option") in list("ABCDE")
        and not (question.get("exam_day") == "1" and int(question.get("question_number") or 0) <= 5)
        and all(question.get(f"option_{key}") for key in "abcde")
    )


def area_quota_for_batch(area: str, batch_size: int) -> int:
    target_total = sum(TARGETS.values())
    target = TARGETS.get(area, 0)
    if not target:
        return batch_size
    return max(1, round(batch_size * target / target_total) + 2)


def area_pressure(question: dict[str, Any], approved_counts: dict[str, int]) -> float:
    area = question.get("area") or ""
    target = TARGETS.get(area, 1)
    return approved_counts.get(area, 0) / target


def build_batch(batch_number: int, selected: list[dict[str, Any]]) -> dict[str, Any]:
    batch_questions = []
    for question in selected:
        reviewed = dict(question)
        blockers = approval_blockers(reviewed)
        reviewed["editorial_batch_id"] = f"batch-{batch_number:03d}"
        reviewed["editorial_decision"] = "pending" if blockers else "ready_for_human_approval"
        reviewed["approval_blockers"] = blockers
        reviewed["resolution_status"] = "pending_editorial_resolution"
        reviewed["resolution"] = None
        reviewed["review_status"] = "pending"
        reviewed["reviewed"] = False
        reviewed["reviewed_by"] = None
        reviewed["reviewed_at"] = None
        batch_questions.append(reviewed)

    decisions = Counter(q["editorial_decision"] for q in batch_questions)
    by_area = Counter(q.get("area") for q in batch_questions)
    by_topic = Counter(q.get("topic") for q in batch_questions)
    summary = {
        "batch_id": f"batch-{batch_number:03d}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(batch_questions),
        "approved": 0,
        "pending": decisions.get("pending", 0) + decisions.get("ready_for_human_approval", 0),
        "rejected": 0,
        "with_media": sum(1 for q in batch_questions if q.get("media_required")),
        "by_area": dict(by_area),
        "by_topic": dict(by_topic),
        "sources": sorted({q.get("official_source") for q in batch_questions if q.get("official_source")}),
        "years": sorted({q.get("year") for q in batch_questions if q.get("year")}),
    }
    return {"summary": summary, "questions": batch_questions}


def approval_blockers(question: dict[str, Any]) -> list[str]:
    blockers = [
        "Resolucao editorial ainda nao produzida.",
        "Classificacao automatica precisa de revisao humana.",
        "Fonte e enunciado precisam de conferencia visual no PDF.",
    ]
    if question.get("media_required"):
        blockers.append("Midia detectada; precisa de verificacao de exibicao/direitos.")
    if question.get("topic") in (None, "", "Assunto a revisar"):
        blockers.append("Assunto/subtopico ainda precisam ser classificados.")
    return blockers


def build_consolidated_report(output_root: Path) -> dict[str, Any]:
    batch_files = sorted(output_root.glob("batch-*/questions.json"))
    questions: list[dict[str, Any]] = []
    for file in batch_files:
        questions.extend(read_questions(file))

    approved = [q for q in questions if q.get("review_status") == "approved"]
    pending = [q for q in questions if q.get("review_status") == "pending"]
    rejected = [q for q in questions if q.get("review_status") == "rejected"]
    by_area = Counter(q.get("area") for q in questions)
    by_subject = Counter(q.get("topic") for q in questions)
    approved_by_area = Counter(q.get("area") for q in approved)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target": TARGETS,
        "total_reviewed_records": len(questions),
        "total_approved": len(approved),
        "total_pending": len(pending),
        "total_rejected": len(rejected),
        "remaining_to_target": {
            area: max(0, target - approved_by_area.get(area, 0))
            for area, target in TARGETS.items()
        },
        "distribution_by_area": dict(by_area),
        "distribution_by_topic": dict(by_subject),
        "with_media": sum(1 for q in questions if q.get("media_required")),
        "sources": sorted({q.get("official_source") for q in questions if q.get("official_source")}),
        "years": sorted({q.get("year") for q in questions if q.get("year")}),
        "coverage_note": (
            "Cobertura calculada sobre lotes preparados, nao sobre questoes aprovadas. "
            "Nenhuma tendencia deve ser tratada como definitiva sem revisao editorial."
        ),
    }


def load_used_keys(output_root: Path) -> set[str]:
    used: set[str] = set()
    for file in sorted(output_root.glob("batch-*/questions.json")):
        for question in read_questions(file):
            used.add(question_key(question))
    return used


def load_approved_counts(output_root: Path) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for file in sorted(output_root.glob("batch-*/questions.json")):
        for question in read_questions(file):
            if question.get("review_status") == "approved":
                counts[question.get("area") or ""] += 1
    return dict(counts)


def question_key(question: dict[str, Any]) -> str:
    return "|".join(
        str(question.get(key) or "")
        for key in ("year", "application", "exam_day", "booklet", "question_number")
    )


def render_batch_md(batch: dict[str, Any]) -> str:
    summary = batch["summary"]
    lines = [
        f"# {summary['batch_id']}",
        "",
        f"- Total: {summary['total']}",
        f"- Aprovadas: {summary['approved']}",
        f"- Pendentes: {summary['pending']}",
        f"- Rejeitadas: {summary['rejected']}",
        f"- Com midia: {summary['with_media']}",
        "",
        "## Questoes",
        "",
    ]
    for q in batch["questions"]:
        blockers = "; ".join(q.get("approval_blockers") or [])
        lines.append(
            f"- {q.get('area')} | {q.get('year')} D{q.get('exam_day')} Q{q.get('question_number')} "
            f"| {q.get('topic')} | {q.get('correct_option')} | {q.get('editorial_decision')} | {blockers}"
        )
    return "\n".join(lines) + "\n"


def render_consolidated_md(report: dict[str, Any]) -> str:
    lines = [
        "# Relatorio consolidado da escala editorial",
        "",
        f"- Total aprovado: {report['total_approved']}",
        f"- Total pendente: {report['total_pending']}",
        f"- Total rejeitado: {report['total_rejected']}",
        f"- Quantidade com midia: {report['with_media']}",
        "",
        "## Distribuicao por area",
        "",
    ]
    for area, count in report["distribution_by_area"].items():
        lines.append(f"- {area}: {count}")
    lines.extend(["", "## Restante para meta aprovada", ""])
    for area, count in report["remaining_to_target"].items():
        lines.append(f"- {area}: {count}")
    lines.extend(["", "## Fontes e anos usados", ""])
    lines.append(f"- Anos: {', '.join(map(str, report['years'])) or '-'}")
    for source in report["sources"]:
        lines.append(f"- {source}")
    lines.extend(["", "## Cobertura", "", report["coverage_note"]])
    return "\n".join(lines) + "\n"


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
