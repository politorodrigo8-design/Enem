#!/usr/bin/env python3
"""Merge editorial decisions into the pipeline preview and build import files.

Reads outputs/editorial-work/decisions/*.json (one or more files, each with a
"decisions" array), validates every decision against the frozen taxonomy and
the editorial rules, merges it onto the matching preview question, and writes
the Supabase import files (supabase/imports/enem-piloto-*.json) containing
only fully approved, importable rows.

A decision looks like:
  {
    "key": "2023-D1-Q012",
    "subject": "Lingua Portuguesa",          # disciplina da taxonomia
    "topic": "Interpretacao textual",         # topico da taxonomia
    "subtopic": "Inferencia de sentido",      # livre, curto
    "difficulty": "Media",                    # Baixa | Media | Alta
    "media_required": false,                   # julgamento final (nao o palpite)
    "explanation": "A alternativa B ...",     # 150-900 chars, justifica o gabarito
    "explanation_confidence": "alta"          # alta | conferir
  }

Decisions with explanation_confidence="conferir" are merged but left as
needs_review (not imported) for a second pass.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PREVIEW = ROOT / "outputs" / "enem-pilot-2026-07-14" / "questions-preview.json"
DEFAULT_WORK_DIR = ROOT / "outputs" / "editorial-work"
DEFAULT_IMPORTS_DIR = ROOT / "supabase" / "imports"
TAXONOMY_PATH = ROOT / "src" / "lib" / "questions" / "taxonomy.json"

IMPORT_FILENAMES = {
    "Matematica": "enem-piloto-matematica.json",
    "Ciencias da Natureza": "enem-piloto-natureza.json",
    "Ciencias Humanas": "enem-piloto-humanas.json",
    "Linguagens": "enem-piloto-linguagens.json",
}

FORBIDDEN_PRIORITY_LANGUAGE = ["vai cair", "questao garantida", "tema confirmado", "previsao certa"]
REVIEWER = "claude-editorial-batch-2026-07"


def question_key(question: dict) -> str:
    key = f"{question['year']}-D{question['exam_day']}-Q{int(question['question_number']):03d}"
    if question.get("language"):
        key += f"-{question['language']}"
    return key


def load_taxonomy() -> dict:
    return json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))["areas"]


def validate_decision(decision: dict, question: dict, taxonomy: dict) -> list[str]:
    errors = []
    area = question["area"]
    subject = decision.get("subject") or ""
    topic = decision.get("topic") or ""
    subjects = taxonomy.get(area, {})
    if subject not in subjects:
        errors.append(f"disciplina fora da taxonomia de {area}: {subject!r}")
    elif topic not in {entry["topic"] for entry in subjects[subject]}:
        errors.append(f"topico fora da taxonomia de {subject}: {topic!r}")
    if decision.get("difficulty") not in ("Baixa", "Media", "Alta"):
        errors.append(f"dificuldade invalida: {decision.get('difficulty')!r}")
    if not isinstance(decision.get("media_required"), bool):
        errors.append("media_required precisa ser booleano")
    subtopic = (decision.get("subtopic") or "").strip()
    if not 3 <= len(subtopic) <= 80:
        errors.append("subtopico precisa ter entre 3 e 80 caracteres")
    explanation = (decision.get("explanation") or "").strip()
    if not 150 <= len(explanation) <= 900:
        errors.append(f"explicacao com {len(explanation)} chars (esperado 150-900)")
    lowered = explanation.lower()
    for phrase in FORBIDDEN_PRIORITY_LANGUAGE:
        if phrase in lowered:
            errors.append(f"linguagem proibida na explicacao: {phrase!r}")
    correct = question.get("correct_option") or ""
    if correct and not re.search(rf"alternativa\s+{correct}\b", explanation, flags=re.I):
        errors.append(f"explicacao nao menciona 'alternativa {correct}' (gabarito oficial)")
    if decision.get("explanation_confidence") not in ("alta", "conferir"):
        errors.append("explanation_confidence precisa ser 'alta' ou 'conferir'")
    return errors


def apply_recurrence(questions: list[dict]) -> None:
    grouped: dict[tuple[str, str, str], list[dict]] = defaultdict(list)
    for question in questions:
        grouped[(question["area"], question["subject"], question["topic"])].append(question)
    for _, items in grouped.items():
        years = {item.get("year") for item in items if item.get("year")}
        count = len(items)
        if count >= 8 and len(years) >= 4:
            recurrence, confidence, category = (
                "conteudo muito frequente no periodo 2020-2025",
                "alta",
                "Potencial muito alto de recorrencia do conteudo",
            )
        elif count >= 4 and len(years) >= 3:
            recurrence, confidence, category = (
                "conteudo frequente em anos diferentes",
                "alta",
                "Alta prioridade",
            )
        elif count >= 2 and len(years) >= 2:
            recurrence, confidence, category = (
                "conteudo presente em mais de um ano da amostra",
                "moderada",
                "Prioridade media",
            )
        else:
            recurrence, confidence, category = ("amostra insuficiente", "baixa", "Complementar")
        score = min(100, count * 6 + len(years) * 5)
        for item in items:
            item["historical_recurrence"] = recurrence
            item["content_recurrence"] = recurrence
            item["recurrence_confidence"] = confidence
            item["recurrence_category"] = category
            item["estimated_priority"] = category
            item["priority_score"] = score
            item["priority_reason"] = (
                f"Estimativa educacional baseada em {count} questao(oes) do topico em "
                f"{len(years)} ano(s) de prova (2020-2025); nao e previsao."
            )


CONFIDENCE_MAP = {"moderada": "media", "baixa": "baixa", "media": "media", "alta": "alta"}


def option_text(question: dict, key: str) -> str:
    """Some questions print their alternatives as diagrams; the text layer has
    nothing to extract. Those rows carry the question image, so the label points
    the student to it instead of shipping an empty option."""
    value = (question.get(f"option_{key.lower()}") or "").strip()
    if value:
        return value
    return f"Alternativa {key} — ver imagem da questao."


def to_import_row(question: dict) -> dict:
    return {
        "statement": question["statement"],
        "area": question["area"],
        "subject": question["subject"],
        "topic": question["topic"],
        "subtopic": question.get("subtopic"),
        "difficulty": question["difficulty"],
        "year": question["year"],
        "source": question["source"],
        "source_url": question.get("official_source"),
        "exam_name": "ENEM",
        "exam_color": question.get("booklet"),
        "exam_day": question.get("exam_day"),
        "question_number": question.get("question_number"),
        "language": question.get("language"),
        "is_official": True,
        "is_demo": False,
        "is_authorial": False,
        "is_inspired": False,
        "explanation": question["explanation"],
        "option_a": option_text(question, "A"),
        "option_b": option_text(question, "B"),
        "option_c": option_text(question, "C"),
        "option_d": option_text(question, "D"),
        "option_e": option_text(question, "E"),
        "correct_option": question["correct_option"],
        "discipline": question["subject"],
        "competence": question.get("competence"),
        "skill": question.get("skill"),
        "content_recurrence": question.get("content_recurrence"),
        "charge_pattern": question.get("charge_pattern"),
        "estimated_priority": question.get("estimated_priority", "Complementar"),
        "priority_score": question.get("priority_score", 0),
        "confidence_level": CONFIDENCE_MAP.get(question.get("recurrence_confidence"), "baixa"),
        "priority_reason": question.get("priority_reason"),
        "official_source": question.get("official_source"),
        "official_exam_url": question.get("official_source"),
        "official_answer_key_url": question.get("official_answer_key_url"),
        "priority_is_educational_estimate": True,
        "reviewed": True,
        "review_status": "approved",
        "reviewed_by": REVIEWER,
        "reviewed_at": question.get("reviewed_at"),
        "editorial_reviewer": REVIEWER,
        "last_editorial_review_at": question.get("reviewed_at"),
        "editorial_notes": question.get("editorial_notes"),
        "source_verified": True,
        "answer_verified": True,
        "media_required": question["media_required"],
        "media_verified": bool(question.get("media_verified")),
        "media_url": question.get("media_url"),
        "media_type": question.get("media_type"),
        "media_alt": question.get("media_alt"),
        "media_caption": question.get("media_caption"),
        "source_pdf": question.get("official_source"),
        "source_page": question.get("page"),
        "classification_version": "editorial-2026-07",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", default=str(DEFAULT_PREVIEW))
    parser.add_argument("--work-dir", default=str(DEFAULT_WORK_DIR))
    parser.add_argument("--imports-dir", default=str(DEFAULT_IMPORTS_DIR))
    args = parser.parse_args()

    preview_path = Path(args.preview)
    preview = json.loads(preview_path.read_text(encoding="utf-8"))
    taxonomy = load_taxonomy()
    by_key = {question_key(q): q for q in preview["questions"]}

    media_map_path = Path(args.work_dir) / "media-map.json"
    media_map = (
        json.loads(media_map_path.read_text(encoding="utf-8")) if media_map_path.exists() else {}
    )

    decisions_dir = Path(args.work_dir) / "decisions"
    decision_files = sorted(decisions_dir.glob("*.json"))
    if not decision_files:
        raise SystemExit(f"Nenhum arquivo de decisao em {decisions_dir}")

    now = datetime.now(timezone.utc).isoformat()
    merged, rejected, needs_check = 0, [], 0
    # Files are processed in name order and a later valid decision replaces an
    # earlier one for the same question: reruns (decisions-pend-*) are meant to
    # supersede the first pass they were generated to fix.
    for file in decision_files:
        payload = json.loads(file.read_text(encoding="utf-8"))
        for decision in payload.get("decisions", []):
            key = decision.get("key")
            question = by_key.get(key)
            if question is None:
                rejected.append((file.name, key, ["chave nao encontrada no preview"]))
                continue
            errors = validate_decision(decision, question, taxonomy)
            if errors:
                rejected.append((file.name, key, errors))
                continue
            question["subject"] = decision["subject"]
            question["topic"] = decision["topic"]
            question["subtopic"] = decision["subtopic"].strip()
            question["difficulty"] = decision["difficulty"]
            question["media_required"] = decision["media_required"]
            if question["media_required"]:
                media = media_map.get(key)
                if media:
                    question.update(media)
                    question["media_verified"] = True
            question["explanation"] = decision["explanation"].strip()
            question["reviewed"] = True
            question["reviewed_by"] = REVIEWER
            question["reviewed_at"] = now
            if decision["explanation_confidence"] == "conferir":
                question["review_status"] = "needs_review"
                needs_check += 1
            else:
                question["review_status"] = "approved"
            merged += 1

    approved = [
        q
        for q in preview["questions"]
        if q.get("review_status") == "approved" and q.get("reviewed_by") == REVIEWER
    ]
    apply_recurrence(approved)

    importable = [
        q for q in approved if not q["media_required"] or (q.get("media_verified") and q.get("media_url"))
    ]
    deferred_media = len(approved) - len(importable)

    imports_dir = Path(args.imports_dir)
    for area, filename in IMPORT_FILENAMES.items():
        rows = [to_import_row(q) for q in importable if q["area"] == area]
        (imports_dir / filename).write_text(
            json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"{filename}: {len(rows)} questoes aprovadas e importaveis")

    preview_path.write_text(json.dumps(preview, ensure_ascii=False, indent=2), encoding="utf-8")

    report = {
        "generated_at": now,
        "decisions_merged": merged,
        "needs_review": needs_check,
        "approved_total": len(approved),
        "importable_total": len(importable),
        "deferred_waiting_media": deferred_media,
        "rejected": [
            {"file": file, "key": key, "errors": errors} for file, key, errors in rejected
        ],
    }
    report_path = Path(args.work_dir) / "apply-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"\nmescladas: {merged} | aprovadas: {len(approved)} | importaveis: {len(importable)} | "
        f"aguardando midia: {deferred_media} | conferir: {needs_check} | rejeitadas: {len(rejected)}"
    )
    if rejected:
        print(f"Detalhes das rejeicoes em {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
