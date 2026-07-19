#!/usr/bin/env python3
"""Export editorial work batches from the pipeline preview.

Splits every extraction-complete, non-annulled, non-duplicate question into
chunked JSON batch files under outputs/editorial-work/batches/. Each batch is
meant to be resolved by one editorial reviewer (human or AI assistant) that
writes a matching decisions file under outputs/editorial-work/decisions/.

A question is identified across files by its stable key:
  {year}-D{day}-Q{number:03d}[-{language}]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PREVIEW = ROOT / "outputs" / "enem-pilot-2026-07-14" / "questions-preview.json"
DEFAULT_WORK_DIR = ROOT / "outputs" / "editorial-work"

AREA_SLUGS = {
    "Matematica": "matematica",
    "Ciencias da Natureza": "natureza",
    "Ciencias Humanas": "humanas",
    "Linguagens": "linguagens",
}


def question_key(question: dict) -> str:
    key = f"{question['year']}-D{question['exam_day']}-Q{int(question['question_number']):03d}"
    if question.get("language"):
        key += f"-{question['language']}"
    return key


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", default=str(DEFAULT_PREVIEW))
    parser.add_argument("--work-dir", default=str(DEFAULT_WORK_DIR))
    parser.add_argument("--batch-size", type=int, default=40)
    parser.add_argument(
        "--only-pending",
        action="store_true",
        help="Exporta apenas questoes ainda nao aprovadas na esteira editorial.",
    )
    parser.add_argument("--prefix", default="batch", help="Prefixo dos arquivos de lote.")
    args = parser.parse_args()

    preview = json.loads(Path(args.preview).read_text(encoding="utf-8"))
    questions = [
        q
        for q in preview["questions"]
        if q.get("extraction_complete") and not q.get("is_annulled") and not q.get("duplicate")
    ]
    if args.only_pending:
        questions = [q for q in questions if q.get("review_status") != "approved"]

    work_dir = Path(args.work_dir)
    batches_dir = work_dir / "batches"
    decisions_dir = work_dir / "decisions"
    batches_dir.mkdir(parents=True, exist_ok=True)
    decisions_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    manifest = []
    for area, slug in AREA_SLUGS.items():
        area_questions = sorted(
            (q for q in questions if q["area"] == area),
            key=lambda q: (q["year"], q["exam_day"], q["question_number"], q.get("language") or ""),
        )
        for index in range(0, len(area_questions), args.batch_size):
            chunk = area_questions[index : index + args.batch_size]
            number = index // args.batch_size + 1
            name = f"{args.prefix}-{slug}-{number:02d}.json"
            rows = [
                {
                    "key": question_key(q),
                    "area": q["area"],
                    "year": q["year"],
                    "exam_day": q["exam_day"],
                    "question_number": q["question_number"],
                    "language": q.get("language"),
                    "statement": q["statement"],
                    "option_a": q["option_a"],
                    "option_b": q["option_b"],
                    "option_c": q["option_c"],
                    "option_d": q["option_d"],
                    "option_e": q["option_e"],
                    "correct_option": q["correct_option"],
                    "media_required_guess": q["media_required"],
                    "auto_subject": q.get("subject"),
                    "auto_topic": q.get("topic"),
                }
                for q in chunk
            ]
            (batches_dir / name).write_text(
                json.dumps({"questions": rows}, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            manifest.append({"batch": name, "area": area, "count": len(rows)})
            total += len(rows)

    (work_dir / "batches-manifest.json").write_text(
        json.dumps({"total": total, "batches": manifest}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"{total} questoes exportadas em {len(manifest)} lotes -> {batches_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
