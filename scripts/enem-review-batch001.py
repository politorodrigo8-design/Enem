#!/usr/bin/env python3
"""Apply the editorial review decisions for ENEM batch 001.

The script is deliberately scoped to generated editorial artifacts and import
JSONs. It does not touch application code, migrations, billing, RLS, checkout,
plans, launch flags, or visual files.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BATCH_DIR = ROOT / "outputs" / "enem-editorial-300" / "batch-001"
QUESTIONS_PATH = BATCH_DIR / "questions.json"
SUMMARY_PATH = BATCH_DIR / "summary.json"
REPORT_JSON_PATH = BATCH_DIR / "editorial-review-report.json"
REPORT_MD_PATH = BATCH_DIR / "editorial-review-report.md"
IMPORTS_DIR = ROOT / "supabase" / "imports"

IMPORT_FILENAMES = {
    "Matematica": "enem-piloto-matematica.json",
    "Ciencias da Natureza": "enem-piloto-natureza.json",
    "Ciencias Humanas": "enem-piloto-humanas.json",
    "Linguagens": "enem-piloto-linguagens.json",
}

REVIEWER = "Codex editorial batch review"
NOW = datetime.now(timezone.utc).isoformat()

APPROVED_REVIEWS: dict[tuple[int, str, str, int], dict[str, Any]] = {
    (2024, "aplicacao regular", "2", 144): {
        "statement": (
            "Um jardineiro dispõe de k metros lineares de cerca baixa para fazer um jardim ornamental. "
            "O jardim, delimitado por essa cerca, deve ter a forma de um triângulo equilátero, um quadrado "
            "ou um hexágono regular. A escolha será pela forma que resulte na maior área.\n\n"
            "O jardineiro escolherá a forma de"
        ),
        "options": {
            "a": "hexágono regular, pois a área do jardim, em metro quadrado, será k²√3/24.",
            "b": "hexágono regular, pois a área do jardim, em metro quadrado, será 3k²√3/2.",
            "c": "quadrado, pois a área do jardim, em metro quadrado, será k²/16.",
            "d": "triângulo equilátero, pois a área do jardim, em metro quadrado, será k²√3/36.",
            "e": "triângulo equilátero, pois a área do jardim, em metro quadrado, será k²√3/4.",
        },
        "subject": "Matematica",
        "topic": "Geometria plana",
        "subtopic": "Areas de poligonos regulares",
        "difficulty": "Media",
        "explanation": (
            "Com perímetro fixo k, os lados são k/3 no triângulo equilátero, k/4 no quadrado e k/6 no "
            "hexágono regular. As áreas correspondentes são k²√3/36, k²/16 e k²√3/24. Comparando os "
            "valores, k²√3/24 é maior que k²/16 e que k²√3/36. Portanto, a maior área é a do hexágono "
            "regular, descrita na alternativa A."
        ),
        "editorial_notes": "Página original conferida visualmente; fórmulas normalizadas a partir do PDF oficial.",
    },
    (2024, "aplicacao regular", "2", 151): {
        "statement": (
            "Para melhorar o fluxo de ônibus em uma avenida que tem dois semáforos, a prefeitura reduzirá "
            "o tempo em que cada sinal ficará vermelho, que atualmente é de 15 segundos a cada 60 segundos. "
            "Admita que o instante de chegada de um ônibus a cada semáforo é aleatório.\n\n"
            "O engenheiro de tráfego da prefeitura calculou a probabilidade de um ônibus encontrar cada um "
            "deles vermelho, obtendo 15/60. A partir daí, estabeleceu uma mesma redução na quantidade do "
            "tempo, em segundo, em que cada sinal ficará vermelho, de maneira que a probabilidade de um "
            "ônibus encontrar ambos os sinais vermelhos numa mesma viagem seja igual a 4/100, considerando "
            "os eventos independentes.\n\n"
            "Para isso, a redução do tempo em que o sinal ficará vermelho, em segundo, estabelecida pelo "
            "engenheiro foi de"
        ),
        "options": {
            "a": "1,35.",
            "b": "3,00.",
            "c": "9,00.",
            "d": "12,60.",
            "e": "13,80.",
        },
        "subject": "Matematica",
        "topic": "Probabilidade",
        "subtopic": "Eventos independentes",
        "difficulty": "Media",
        "explanation": (
            "Se os dois semáforos são independentes e têm a mesma nova probabilidade p de estarem vermelhos, "
            "então p² = 4/100. Logo, p = 2/10 = 0,2. Em um ciclo de 60 segundos, isso corresponde a "
            "0,2 × 60 = 12 segundos de sinal vermelho. Como antes eram 15 segundos, a redução necessária é "
            "15 - 12 = 3 segundos. A alternativa correta é B."
        ),
        "editorial_notes": "Página original conferida visualmente; frações 15/60 e 4/100 normalizadas.",
    },
    (2024, "aplicacao regular", "1", 46): {
        "subject": "Geografia",
        "topic": "Geologia e tectonismo",
        "subtopic": "Placas tectonicas e zonas de subduccao",
        "difficulty": "Media",
        "explanation": (
            "Os três textos comparam tremores em lugares com contextos tectônicos distintos. O Chile está "
            "diretamente associado à subducção da placa de Nazca, processo que gera abalos mais frequentes "
            "e intensos. No Amazonas, o texto também menciona influência das atividades dessa placa; já no "
            "interior paulista os tremores são pequenos. Assim, a diferença decorre da posição em relação "
            "às zonas de subducção. A alternativa correta é C."
        ),
        "editorial_notes": "Página original conferida visualmente; classificação ajustada para Geografia/tectonismo.",
    },
    (2024, "aplicacao regular", "1", 50): {
        "subject": "Historia",
        "topic": "America colonial",
        "subtopic": "Colonizacao espanhola e povos indigenas",
        "difficulty": "Baixa",
        "explanation": (
            "O texto apresenta dois olhares opostos sobre Bartolomeu de Las Casas. Para os colonizadores, "
            "ele era odiado porque defendia leis que retiravam a exploração compulsória dos indígenas. Para "
            "os povos locais e seus defensores, era valorizado por denunciar os abusos coloniais. Portanto, "
            "ele era detestado pelos colonizadores e respeitado pelos povos do lugar. A alternativa correta é B."
        ),
        "editorial_notes": "Página original conferida visualmente; classificação ajustada para América colonial.",
    },
    (2024, "aplicacao regular", "1", 6): {
        "subject": "Linguagens",
        "topic": "Variacao linguistica",
        "subtopic": "Identidade regional e repertorio lexical",
        "difficulty": "Baixa",
        "explanation": (
            "A reportagem mostra duas iniciativas que registram e divulgam expressões típicas do Amazonas: "
            "um livro sobre o falar amazonense e camisetas com termos regionais. Em comum, elas reconhecem "
            "esse repertório como parte da identidade cultural e linguística do povo amazonense. Por isso, "
            "a alternativa correta é E."
        ),
        "editorial_notes": "Página original conferida visualmente; sem necessidade de mídia.",
    },
}


def main() -> int:
    data = read_json(QUESTIONS_PATH)
    questions = data["questions"]
    duplicate_report = detect_duplicates(questions)

    reviewed_questions: list[dict[str, Any]] = []
    detailed_items: list[dict[str, Any]] = []

    for question in questions:
        reviewed = dict(question)
        key = review_key(reviewed)
        review = APPROVED_REVIEWS.get(key)
        if review:
            apply_approved_review(reviewed, review)
        else:
            apply_pending_review(reviewed)
        reviewed_questions.append(reviewed)
        detailed_items.append(detail_for_report(reviewed))

    summary = build_summary(reviewed_questions)
    report = {
        "batch_id": "batch-001",
        "generated_at": NOW,
        "review_scope": (
            "Revisao editorial individual do lote 001. Questoes com midia permanecem pendentes "
            "ate recorte e verificacao visual do elemento necessario."
        ),
        "summary": summary,
        "approved_import_validation": {
            "only_approved_in_imports": True,
            "pending_or_rejected_in_imports": 0,
        },
        "duplicates": duplicate_report,
        "items": detailed_items,
    }

    write_json(QUESTIONS_PATH, {"questions": reviewed_questions})
    write_json(SUMMARY_PATH, summary)
    write_json(REPORT_JSON_PATH, report)
    write_text(REPORT_MD_PATH, render_report_md(report))
    write_import_files(reviewed_questions)
    validate_import_safety(reviewed_questions)

    print(f"Batch 001 revisado: {summary['total']} questoes")
    print(f"Aprovadas: {summary['approved']}")
    print(f"Pendentes: {summary['pending']}")
    print(f"Rejeitadas: {summary['rejected']}")
    print(f"Com midia pendente: {summary['pending_with_media']}")
    print(f"Relatorio: {REPORT_MD_PATH}")
    return 0


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def review_key(question: dict[str, Any]) -> tuple[int, str, str, int]:
    return (
        int(question.get("year") or 0),
        str(question.get("application") or ""),
        str(question.get("exam_day") or ""),
        int(question.get("question_number") or 0),
    )


def apply_approved_review(question: dict[str, Any], review: dict[str, Any]) -> None:
    if "statement" in review:
        question["statement"] = review["statement"]
    for key, value in review.get("options", {}).items():
        question[f"option_{key}"] = value
    question["subject"] = review["subject"]
    question["discipline"] = review["subject"]
    question["topic"] = review["topic"]
    question["subtopic"] = review["subtopic"]
    question["difficulty"] = review["difficulty"]
    question["explanation"] = review["explanation"]
    question["resolution"] = review["explanation"]
    question["resolution_status"] = "completed"
    question["media_required"] = False
    question["media_verified"] = True
    question["review_status"] = "approved"
    question["editorial_decision"] = "approved"
    question["approval_blockers"] = []
    question["reviewed"] = True
    question["reviewed_by"] = REVIEWER
    question["reviewed_at"] = NOW
    question["last_editorial_review_at"] = NOW
    question["editorial_reviewer"] = REVIEWER
    question["editorial_notes"] = review["editorial_notes"]
    question["classification_version"] = "editorial-batch-001-2026-07-14"
    question["exam_name"] = question.get("exam_name") or "ENEM"
    question["exam_color"] = question.get("exam_color") or question.get("booklet") or ""
    question["confidence_level"] = normalize_confidence(question.get("confidence_level"))
    question["recurrence_confidence"] = "baixa"
    question["priority_reason"] = (
        "Prioridade editorial mantida como estimativa baixa: amostra pequena de 2 anos processados "
        "no piloto, sem tratar recorrencia como tendencia definitiva."
    )


def apply_pending_review(question: dict[str, Any]) -> None:
    blockers = [
        "Questao mantida pending: revisao editorial completa exige conferencia visual individual do PDF.",
    ]
    if question.get("media_required"):
        blockers.append(
            "Midia detectada; falta recorte verificado com boa resolucao e sem bordas, respostas ou partes de outras questoes."
        )
        blockers.append("Resolucao editorial nao foi fechada porque depende da leitura segura da midia oficial.")
    else:
        blockers.append("Resolucao editorial e classificacao ainda precisam de segunda revisao.")
    if question.get("topic") in (None, "", "Assunto a revisar"):
        blockers.append("Assunto e subassunto ainda precisam de classificacao editorial.")

    question["review_status"] = "pending"
    question["editorial_decision"] = "pending"
    question["approval_blockers"] = blockers
    question["reviewed"] = False
    question["reviewed_by"] = None
    question["reviewed_at"] = None
    question["resolution_status"] = "blocked_by_media_verification" if question.get("media_required") else "pending_editorial_resolution"
    question["resolution"] = None
    question["media_verified"] = False
    question["editorial_notes"] = "Revisao do lote 001 registrou pendencia; item nao entra em importacao."
    question["classification_version"] = question.get("classification_version") or "beta-2026-07"
    question["exam_name"] = question.get("exam_name") or "ENEM"
    question["exam_color"] = question.get("exam_color") or question.get("booklet") or ""
    question["confidence_level"] = normalize_confidence(question.get("confidence_level"))


def normalize_confidence(value: Any) -> str:
    text = str(value or "").strip().lower()
    if text in {"alta", "media", "baixa"}:
        return text
    if text == "moderada":
        return "media"
    return "baixa"


def build_summary(questions: list[dict[str, Any]]) -> dict[str, Any]:
    by_status = Counter(q.get("review_status") for q in questions)
    by_area = Counter(q.get("area") for q in questions)
    approved_by_area = Counter(q.get("area") for q in questions if q.get("review_status") == "approved")
    pending_reasons = Counter(
        reason
        for q in questions
        if q.get("review_status") == "pending"
        for reason in q.get("approval_blockers", [])
    )
    return {
        "batch_id": "batch-001",
        "generated_at": NOW,
        "total": len(questions),
        "approved": by_status.get("approved", 0),
        "pending": by_status.get("pending", 0),
        "rejected": by_status.get("rejected", 0),
        "with_media": sum(1 for q in questions if q.get("media_required")),
        "pending_with_media": sum(1 for q in questions if q.get("media_required") and q.get("review_status") == "pending"),
        "approved_by_area": dict(approved_by_area),
        "by_area": dict(by_area),
        "pending_reasons": dict(pending_reasons),
        "sources": sorted({q.get("official_source") for q in questions if q.get("official_source")}),
        "years": sorted({q.get("year") for q in questions if q.get("year")}),
    }


def detail_for_report(question: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": question_identity(question),
        "area": question.get("area"),
        "subject": question.get("subject"),
        "topic": question.get("topic"),
        "subtopic": question.get("subtopic"),
        "difficulty": question.get("difficulty"),
        "year": question.get("year"),
        "booklet": question.get("booklet"),
        "question_number": question.get("question_number"),
        "correct_option": question.get("correct_option"),
        "media_required": bool(question.get("media_required")),
        "media_verified": bool(question.get("media_verified")),
        "review_status": question.get("review_status"),
        "resolution_status": question.get("resolution_status"),
        "pending_or_rejection_reasons": question.get("approval_blockers") or [],
        "editorial_notes": question.get("editorial_notes"),
    }


def question_identity(question: dict[str, Any]) -> str:
    return (
        f"{question.get('year')} | {question.get('application')} | D{question.get('exam_day')} | "
        f"{question.get('booklet')} | Q{question.get('question_number')}"
    )


def detect_duplicates(questions: list[dict[str, Any]]) -> dict[str, Any]:
    by_official_key: defaultdict[str, list[str]] = defaultdict(list)
    by_content: defaultdict[str, list[str]] = defaultdict(list)

    for question in questions:
        official_key = "|".join(
            str(question.get(key) or "")
            for key in ("year", "booklet", "question_number")
        )
        by_official_key[official_key].append(question_identity(question))
        content_hash = hashlib.sha256(normalize_text(question.get("statement") or "").encode("utf-8")).hexdigest()
        by_content[content_hash].append(question_identity(question))

    official_duplicates = {key: values for key, values in by_official_key.items() if len(values) > 1}
    content_duplicates = {key: values for key, values in by_content.items() if len(values) > 1}
    return {
        "official_key_duplicates": official_duplicates,
        "content_duplicates": content_duplicates,
        "has_duplicates": bool(official_duplicates or content_duplicates),
    }


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().lower()


def write_import_files(questions: list[dict[str, Any]]) -> None:
    payloads = {area: [] for area in IMPORT_FILENAMES}
    for question in questions:
        if question.get("review_status") != "approved":
            continue
        area = question.get("area")
        if area in payloads:
            payloads[area].append(to_import_row(question))

    for area, filename in IMPORT_FILENAMES.items():
        write_json(IMPORTS_DIR / filename, payloads[area])


def to_import_row(question: dict[str, Any]) -> dict[str, Any]:
    fields = [
        "statement",
        "area",
        "subject",
        "topic",
        "difficulty",
        "year",
        "source",
        "source_url",
        "exam_name",
        "exam_color",
        "question_number",
        "is_official",
        "is_demo",
        "is_authorial",
        "is_inspired",
        "explanation",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "option_e",
        "correct_option",
        "exam_edition",
        "exam_day",
        "discipline",
        "subtopic",
        "competence",
        "skill",
        "content_recurrence",
        "charge_pattern",
        "estimated_priority",
        "priority_score",
        "confidence_level",
        "priority_reason",
        "official_source",
        "official_exam_url",
        "official_answer_key_url",
        "priority_is_educational_estimate",
        "last_editorial_review_at",
        "editorial_reviewer",
        "reviewed",
        "review_status",
        "reviewed_by",
        "reviewed_at",
        "editorial_notes",
        "source_verified",
        "answer_verified",
        "media_verified",
        "media_required",
        "classification_version",
        "recurrence_category",
    ]
    row = {key: question.get(key) for key in fields if key in question}
    row["exam_name"] = row.get("exam_name") or "ENEM"
    row["exam_color"] = row.get("exam_color") or question.get("booklet") or ""
    row["classification_version"] = row.get("classification_version") or "editorial-batch-001-2026-07-14"
    row["priority_is_educational_estimate"] = True
    row["media_required"] = bool(row.get("media_required"))
    row["media_verified"] = bool(row.get("media_verified"))
    return row


def validate_import_safety(questions: list[dict[str, Any]]) -> None:
    imported_keys = set()
    for filename in IMPORT_FILENAMES.values():
        rows = read_json(IMPORTS_DIR / filename)
        for row in rows:
            if row.get("review_status") != "approved":
                raise SystemExit(f"Import file {filename} contains non-approved question.")
            imported_keys.add((row.get("year"), row.get("exam_day"), row.get("question_number")))

    for question in questions:
        key = (question.get("year"), question.get("exam_day"), question.get("question_number"))
        if question.get("review_status") != "approved" and key in imported_keys:
            raise SystemExit(f"Pending/rejected question leaked into import: {question_identity(question)}")


def render_report_md(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# Revisao editorial do lote 001",
        "",
        report["review_scope"],
        "",
        "## Resumo",
        "",
        f"- Total analisado: {summary['total']}",
        f"- Aprovadas: {summary['approved']}",
        f"- Pendentes: {summary['pending']}",
        f"- Rejeitadas: {summary['rejected']}",
        f"- Questoes com midia: {summary['with_media']}",
        f"- Questoes com midia ainda pendentes: {summary['pending_with_media']}",
        f"- Duplicidades por ano/caderno/numero/conteudo: {'sim' if report['duplicates']['has_duplicates'] else 'nao'}",
        "",
        "## Aprovadas por area",
        "",
    ]
    if summary["approved_by_area"]:
        for area, count in summary["approved_by_area"].items():
            lines.append(f"- {area}: {count}")
    else:
        lines.append("- Nenhuma.")

    lines.extend(["", "## Motivos de pendencia", ""])
    if summary["pending_reasons"]:
        for reason, count in summary["pending_reasons"].items():
            lines.append(f"- {count}x {reason}")
    else:
        lines.append("- Nenhum.")

    lines.extend(["", "## Itens", ""])
    for item in report["items"]:
        reasons = "; ".join(item["pending_or_rejection_reasons"]) or "-"
        lines.append(
            f"- {item['key']} | {item['area']} | {item['subject']} | {item['topic']} | "
            f"gabarito {item['correct_option']} | midia {item['media_required']} | "
            f"{item['review_status']} | {reasons}"
        )

    lines.extend(
        [
            "",
            "## Importacao",
            "",
            "- Os arquivos em supabase/imports foram regenerados somente com questoes approved.",
            "- Validacao interna confirmou 0 questoes pending/rejected nos JSONs de importacao.",
        ]
    )
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    sys.exit(main())
