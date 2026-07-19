#!/usr/bin/env python3
"""Compute topic recurrence from our own 2020-2025 corpus.

Counts approved questions per (area, subject, topic) across exam years and
compares the result with the recurrence_hint recorded in the frozen taxonomy
(which came from public studies). Writes:

- outputs/editorial-work/recurrence-report.md  (human reading, incl. divergences)
- outputs/editorial-work/topics-recurrence.json (machine input for the DB update)

Recurrence tiers are frequency-based, never predictive: they describe what the
corpus contains, not what the next exam will ask.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PREVIEW = ROOT / "outputs" / "enem-pilot-2026-07-14" / "questions-preview.json"
DEFAULT_OUT_DIR = ROOT / "outputs" / "editorial-work"
TAXONOMY_PATH = ROOT / "src" / "lib" / "questions" / "taxonomy.json"


def tier(rank: int, total_topics: int, years: int) -> str:
    """Rank-based within the area: an absolute share threshold would call every
    topic 'baixa' in areas that spread across many topics. Recurring across
    several exam years is required for the top tier."""
    if total_topics <= 1:
        return "media"
    position = rank / total_topics
    if position <= 0.3 and years >= 4:
        return "alta"
    if position <= 0.7 and years >= 2:
        return "media"
    return "baixa"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", default=str(DEFAULT_PREVIEW))
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    args = parser.parse_args()

    preview = json.loads(Path(args.preview).read_text(encoding="utf-8"))
    taxonomy = json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))["areas"]

    approved = [q for q in preview["questions"] if q.get("review_status") == "approved"]
    by_area_total: dict[str, int] = defaultdict(int)
    stats: dict[tuple[str, str, str], dict] = defaultdict(lambda: {"count": 0, "years": set()})
    for question in approved:
        key = (question["area"], question["subject"], question["topic"])
        stats[key]["count"] += 1
        stats[key]["years"].add(question["year"])
        by_area_total[question["area"]] += 1

    topics_per_area: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for key in stats:
        topics_per_area[key[0]].append(key)
    rank_by_key: dict[tuple[str, str, str], tuple[int, int]] = {}
    for area, keys in topics_per_area.items():
        ordered = sorted(keys, key=lambda k: -stats[k]["count"])
        for index, key in enumerate(ordered):
            rank_by_key[key] = (index, len(ordered))

    rows = []
    for (area, subject, topic), data in stats.items():
        share = data["count"] / max(by_area_total[area], 1)
        hint = next(
            (
                entry["recurrence_hint"]
                for entry in taxonomy.get(area, {}).get(subject, [])
                if entry["topic"] == topic
            ),
            None,
        )
        rank, total_topics = rank_by_key[(area, subject, topic)]
        measured = tier(rank, total_topics, len(data["years"]))
        rows.append(
            {
                "area": area,
                "subject": subject,
                "topic": topic,
                "questions": data["count"],
                "years": sorted(data["years"]),
                "area_share": round(share * 100, 1),
                "measured_tier": measured,
                "public_hint": hint,
                "diverges": bool(hint and hint != measured),
            }
        )
    rows.sort(key=lambda row: (row["area"], -row["questions"]))

    out_dir = Path(args.out_dir)
    (out_dir / "topics-recurrence.json").write_text(
        json.dumps({"corpus_questions": len(approved), "topics": rows}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    lines = [
        "# Recorrencia medida no corpus proprio (ENEM 2020-2025)",
        "",
        f"Base: {len(approved)} questoes oficiais aprovadas na esteira editorial.",
        "",
        "Os niveis descrevem a frequencia observada no corpus. Nao sao previsao do",
        "conteudo da proxima prova.",
        "",
    ]
    for area in sorted(by_area_total):
        lines.append(f"## {area} ({by_area_total[area]} questoes)")
        lines.append("")
        lines.append("| disciplina | topico | questoes | % da area | anos | nivel medido | estimativa publica |")
        lines.append("| --- | --- | ---: | ---: | ---: | --- | --- |")
        for row in [r for r in rows if r["area"] == area]:
            flag = " *" if row["diverges"] else ""
            lines.append(
                f"| {row['subject']} | {row['topic']} | {row['questions']} | {row['area_share']}% | "
                f"{len(row['years'])} | {row['measured_tier']}{flag} | {row['public_hint'] or '-'} |"
            )
        lines.append("")
    divergences = [r for r in rows if r["diverges"]]
    lines.append(f"## Divergencias vs estimativas publicas ({len(divergences)})")
    lines.append("")
    for row in divergences:
        lines.append(
            f"- {row['area']} / {row['topic']}: medido **{row['measured_tier']}** "
            f"({row['questions']} questoes, {row['area_share']}%), estimativa publica {row['public_hint']}."
        )
    (out_dir / "recurrence-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"{len(rows)} topicos medidos sobre {len(approved)} questoes aprovadas.")
    print(f"{len(divergences)} divergencias vs estimativas publicas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
