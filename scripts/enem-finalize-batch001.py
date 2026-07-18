#!/usr/bin/env python3
"""Finalize batch 001 after media extraction and visual audit."""

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
REPORT_JSON = BATCH_DIR / "editorial-review-report.json"
REPORT_MD = BATCH_DIR / "editorial-review-report.md"
IMPORTS_DIR = ROOT / "supabase" / "imports"
NOW = datetime.now(timezone.utc).isoformat()
REVIEWER = "Codex editorial batch review"

IMPORT_FILENAMES = {
    "Matematica": "enem-piloto-matematica.json",
    "Ciencias da Natureza": "enem-piloto-natureza.json",
    "Ciencias Humanas": "enem-piloto-humanas.json",
    "Linguagens": "enem-piloto-linguagens.json",
}

APPROVALS: dict[tuple[int, str, str, int], dict[str, Any]] = {
    (2023, "aplicacao regular", "1", 46): {
        "statement": "A definição de Sertão descrita no bordado associa esse recorte espacial a",
        "subject": "Geografia",
        "topic": "Lugar e identidade",
        "subtopic": "Memoria, afetividade e representacao do espaco",
        "difficulty": "Media",
        "explanation": "O bordado associa o Sertão à figura da avó e a caminhos feitos com linhas coloridas. A representação não define o espaço por fronteiras administrativas ou interesses econômicos, mas por memória, experiência familiar e trajetórias afetivas. Por isso, a alternativa correta é C: vivências e itinerários socioafetivos.",
        "notes": "Enunciado recomposto por conferência visual da página oficial; fotografia recortada e vinculada.",
    },
    (2024, "aplicacao regular", "1", 73): {
        "subject": "Historia",
        "topic": "Cultura popular e impressos",
        "subtopic": "Xilogravura e literatura de cordel",
        "difficulty": "Media",
        "explanation": "O texto descreve a passagem de imagens fotográficas, desenhos e fotogramas para clichês xilográficos usados nas capas de folhetos. Essa incorporação técnica renovou a aparência e o modo de apresentação editorial do cordel, não a narrativa literária nem uma indústria regional. A alternativa correta é D.",
        "notes": "Reclassificada como sem mídia obrigatória; texto conferido na página oficial.",
    },
    (2024, "aplicacao regular", "1", 75): {
        "subject": "Historia",
        "topic": "Iluminismo e esfera publica",
        "subtopic": "Saloes, cafes e circulacao de ideias",
        "difficulty": "Media",
        "explanation": "O texto contrapõe salões, frequentados por grupos mais próximos da elite, e cafés, descritos como espaços abertos. No Iluminismo, esses ambientes ampliavam a circulação de ideias, mas também diferenciavam socialmente os pensadores. Assim, a alternativa correta é A.",
        "notes": "Reclassificada como sem mídia obrigatória; texto conferido na página oficial.",
    },
    (2023, "aplicacao regular", "1", 50): {
        "subject": "Historia",
        "topic": "Cultura afro-brasileira",
        "subtopic": "Critica ao eurocentrismo",
        "difficulty": "Baixa",
        "explanation": "A plataforma citada busca recuperar trajetórias negras apagadas ou reduzidas pela perspectiva colonizadora. Ao ampliar a história da formação cultural brasileira para além do ponto de vista europeu, a iniciativa favorece a crítica ao eurocentrismo. A alternativa correta é E.",
        "notes": "Reclassificada como sem mídia obrigatória; texto conferido na página oficial.",
    },
    (2023, "aplicacao regular", "1", 63): {
        "subject": "Historia",
        "topic": "Circulacao cultural no mundo colonial",
        "subtopic": "Chinesices no barroco mineiro",
        "difficulty": "Media",
        "explanation": "O texto mostra que porcelanas, tecidos, gravuras e outros objetos chineses chegaram ao Brasil por redes comerciais dos séculos XVII e XVIII e influenciaram igrejas barrocas mineiras. O processo artístico descrito dependeu desse intercâmbio entre continentes. A alternativa correta é B.",
        "notes": "Reclassificada como sem mídia obrigatória; texto conferido na página oficial.",
    },
    (2024, "aplicacao regular", "1", 17): {
        "subject": "Linguagens",
        "topic": "Argumentacao e sociedade digital",
        "subtopic": "Vies racial em plataformas digitais",
        "difficulty": "Baixa",
        "explanation": "O dado de aumento de 6 000% no alcance, após o uso de fotografias de modelos brancas, é apresentado como evidência de que conteúdos semelhantes têm circulação diferente conforme a racialização de quem aparece neles. O dado comprova a relação entre alcance digital e viés racial. A alternativa correta é E.",
        "notes": "Reclassificada como sem mídia obrigatória; removido bloqueio por falso positivo de mídia.",
    },
    (2024, "aplicacao regular", "1", 34): {
        "subject": "Linguagens",
        "topic": "Diversidade linguistica",
        "subtopic": "Tecnologia e registro de linguas indigenas",
        "difficulty": "Baixa",
        "explanation": "O aplicativo Linklado facilita combinações de acentos e letras necessárias para registrar línguas indígenas. Com isso, reduz barreiras técnicas e amplia as possibilidades de escrita dessas línguas pelos próprios povos originários. A alternativa correta é B.",
        "notes": "Reclassificada como sem mídia obrigatória; texto conferido na página oficial.",
    },
    (2024, "aplicacao regular", "1", 40): {
        "subject": "Linguagens",
        "topic": "Cultura popular",
        "subtopic": "Manifestacao folclorica e pertencimento",
        "difficulty": "Baixa",
        "explanation": "O texto aproxima o Festival de Parintins de uma lógica de torcida: rivalidade, lados opostos, gritos, canções e identificação com um dos bois. Essa dinâmica lembra o funcionamento social do esporte. A alternativa correta é D.",
        "notes": "Reclassificada como sem mídia obrigatória; texto conferido na página oficial.",
    },
    (2023, "aplicacao regular", "1", 36): {
        "subject": "Linguagens",
        "topic": "Patrimonio cultural",
        "subtopic": "Marabaixo e memoria afro-brasileira",
        "difficulty": "Baixa",
        "explanation": "O Marabaixo parte da memória traumática da escravização, mas a transforma em práticas coletivas de dança, canto, religiosidade e celebração cultural reconhecidas como patrimônio. Por isso, sua função é ressignificar episódios dramáticos em novas práticas culturais. A alternativa correta é A.",
        "notes": "Reclassificada como sem mídia obrigatória; texto conferido na página oficial.",
    },
}


def main() -> int:
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))["questions"]
    for question in questions:
        if question.get("review_status") == "approved":
            normalize_approved(question)
            continue

        approval = APPROVALS.get(key_for(question))
        if approval:
            approve(question, approval)
        else:
            keep_pending(question)

    report = build_report(questions)
    write_json(QUESTIONS_PATH, {"questions": questions})
    write_json(SUMMARY_PATH, report["summary"])
    write_json(REPORT_JSON, report)
    write_text(REPORT_MD, render_report(report))
    write_imports(questions)
    assert_import_safety(questions)

    print(f"Aprovadas: {report['summary']['approved']}")
    print(f"Pendentes: {report['summary']['pending']}")
    print(f"Rejeitadas: {report['summary']['rejected']}")
    print(f"Imports approved-only: ok")
    return 0


def key_for(question: dict[str, Any]) -> tuple[int, str, str, int]:
    return (
        int(question.get("year") or 0),
        str(question.get("application") or ""),
        str(question.get("exam_day") or ""),
        int(question.get("question_number") or 0),
    )


def approve(question: dict[str, Any], approval: dict[str, Any]) -> None:
    if approval.get("statement"):
        question["statement"] = approval["statement"]
    question["subject"] = approval["subject"]
    question["discipline"] = approval["subject"]
    question["topic"] = approval["topic"]
    question["subtopic"] = approval["subtopic"]
    question["difficulty"] = approval["difficulty"]
    question["explanation"] = approval["explanation"]
    question["resolution"] = approval["explanation"]
    question["resolution_status"] = "completed"
    question["review_status"] = "approved"
    question["editorial_decision"] = "approved"
    question["approval_blockers"] = []
    question["reviewed"] = True
    question["reviewed_by"] = REVIEWER
    question["reviewed_at"] = NOW
    question["last_editorial_review_at"] = NOW
    question["editorial_reviewer"] = REVIEWER
    question["editorial_notes"] = approval["notes"]
    question["classification_version"] = "editorial-batch-001-2026-07-14"
    question["exam_name"] = question.get("exam_name") or "ENEM"
    question["exam_color"] = question.get("exam_color") or question.get("booklet") or ""
    question["media_verified"] = bool(not question.get("media_required") or question.get("media_metadata"))
    question["confidence_level"] = normalize_confidence(question.get("confidence_level"))
    question["priority_reason"] = "Amostra piloto pequena: 2 anos processados; recorrencia tratada com confianca baixa, nao como tendencia definitiva."


def normalize_approved(question: dict[str, Any]) -> None:
    question["exam_name"] = question.get("exam_name") or "ENEM"
    question["exam_color"] = question.get("exam_color") or question.get("booklet") or ""
    question["media_verified"] = bool(not question.get("media_required") or question.get("media_metadata"))
    question["confidence_level"] = normalize_confidence(question.get("confidence_level"))
    question["classification_version"] = question.get("classification_version") or "editorial-batch-001-2026-07-14"


def keep_pending(question: dict[str, Any]) -> None:
    blockers: list[str] = []
    media_metadata = question.get("media_metadata") or {}
    if question.get("media_required"):
        if media_metadata.get("validation_status") == "validated":
            blockers.append("Midia recortada e validada, mas resolucao/classificacao editorial ainda nao foi fechada para publicacao.")
        else:
            blockers.append("Midia obrigatoria ainda sem validacao visual completa.")
    else:
        blockers.append("Item sem midia obrigatoria, mas ainda precisa revisao de enunciado, classificacao e resolucao.")
    if question.get("topic") in (None, "", "Assunto a revisar"):
        blockers.append("Assunto/subassunto ainda precisam de classificacao editorial.")
    if has_footer_noise(question.get("statement") or ""):
        blockers.append("Enunciado contem ruido de rodape/caderno e precisa limpeza antes da aprovacao.")
    question["review_status"] = "pending"
    question["editorial_decision"] = "pending"
    question["approval_blockers"] = blockers
    question["reviewed"] = False
    question["reviewed_by"] = None
    question["reviewed_at"] = None
    question["resolution_status"] = "pending_editorial_resolution"
    question["resolution"] = None
    question["editorial_notes"] = "Pendente apos etapa de midia do lote 001; nao entra nos imports."


def has_footer_noise(value: str) -> bool:
    return "CADERNO" in value and "DIA" in value


def normalize_confidence(value: Any) -> str:
    text = str(value or "").strip().lower()
    if text == "moderada":
        return "media"
    return text if text in {"baixa", "media", "alta"} else "baixa"


def build_report(questions: list[dict[str, Any]]) -> dict[str, Any]:
    duplicates = detect_duplicates(questions)
    summary = {
        "batch_id": "batch-001",
        "generated_at": NOW,
        "total": len(questions),
        "approved": sum(1 for q in questions if q.get("review_status") == "approved"),
        "pending": sum(1 for q in questions if q.get("review_status") == "pending"),
        "rejected": sum(1 for q in questions if q.get("review_status") == "rejected"),
        "with_media": sum(1 for q in questions if q.get("media_required")),
        "approved_with_media": sum(1 for q in questions if q.get("review_status") == "approved" and q.get("media_required")),
        "pending_with_media": sum(1 for q in questions if q.get("review_status") == "pending" and q.get("media_required")),
        "approved_by_area": dict(Counter(q.get("area") for q in questions if q.get("review_status") == "approved")),
        "pending_by_area": dict(Counter(q.get("area") for q in questions if q.get("review_status") == "pending")),
        "sources": sorted({q.get("official_source") for q in questions if q.get("official_source")}),
        "years": sorted({q.get("year") for q in questions if q.get("year")}),
    }
    return {
        "batch_id": "batch-001",
        "generated_at": NOW,
        "summary": summary,
        "duplicates": duplicates,
        "items": [item_report(q) for q in questions],
    }


def item_report(question: dict[str, Any]) -> dict[str, Any]:
    metadata = question.get("media_metadata") or {}
    return {
        "key": identity(question),
        "area": question.get("area"),
        "subject": question.get("subject"),
        "topic": question.get("topic"),
        "subtopic": question.get("subtopic"),
        "difficulty": question.get("difficulty"),
        "correct_option": question.get("correct_option"),
        "review_status": question.get("review_status"),
        "media_required": bool(question.get("media_required")),
        "media_url": question.get("media_url"),
        "media_type": metadata.get("media_type"),
        "source_page": metadata.get("source_page"),
        "coordinates": metadata.get("coordinates"),
        "pending_or_rejection_reasons": question.get("approval_blockers") or [],
    }


def identity(question: dict[str, Any]) -> str:
    return f"{question.get('year')} {question.get('application')} D{question.get('exam_day')} {question.get('booklet')} Q{question.get('question_number')}"


def detect_duplicates(questions: list[dict[str, Any]]) -> dict[str, Any]:
    by_key: defaultdict[str, list[str]] = defaultdict(list)
    by_content: defaultdict[str, list[str]] = defaultdict(list)
    for question in questions:
        by_key[f"{question.get('year')}|{question.get('booklet')}|{question.get('question_number')}"].append(identity(question))
        normalized = re.sub(r"\s+", " ", question.get("statement") or "").strip().lower()
        by_content[hashlib.sha256(normalized.encode("utf-8")).hexdigest()].append(identity(question))
    return {
        "official_key_duplicates": {k: v for k, v in by_key.items() if len(v) > 1},
        "content_duplicates": {k: v for k, v in by_content.items() if len(v) > 1},
    }


def write_imports(questions: list[dict[str, Any]]) -> None:
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
        "statement", "area", "subject", "topic", "difficulty", "year", "source", "source_url",
        "exam_name", "exam_color", "question_number", "is_official", "is_demo", "is_authorial",
        "is_inspired", "explanation", "option_a", "option_b", "option_c", "option_d", "option_e",
        "correct_option", "exam_edition", "exam_day", "discipline", "subtopic", "competence",
        "skill", "content_recurrence", "charge_pattern", "estimated_priority", "priority_score",
        "confidence_level", "priority_reason", "official_source", "official_exam_url",
        "official_answer_key_url", "priority_is_educational_estimate", "last_editorial_review_at",
        "editorial_reviewer", "reviewed", "review_status", "reviewed_by", "reviewed_at",
        "editorial_notes", "source_verified", "answer_verified", "media_verified", "media_required",
        "media_url", "media_type", "media_alt", "media_caption", "source_pdf", "source_page",
        "media_width", "media_height", "media_metadata", "classification_version", "recurrence_category",
    ]
    row = {field: question.get(field) for field in fields if field in question}
    metadata = question.get("media_metadata") or {}
    if question.get("media_url"):
        row["media_type"] = metadata.get("media_type") or "image"
        row["source_pdf"] = metadata.get("source_pdf_file") or question.get("official_source")
        row["source_page"] = metadata.get("source_page") or ""
        row["media_width"] = metadata.get("width") or ""
        row["media_height"] = metadata.get("height") or ""
    row["exam_name"] = row.get("exam_name") or "ENEM"
    row["exam_color"] = row.get("exam_color") or question.get("booklet") or ""
    row["priority_is_educational_estimate"] = True
    return row


def assert_import_safety(questions: list[dict[str, Any]]) -> None:
    approved_keys = {(q.get("year"), q.get("exam_day"), q.get("question_number")) for q in questions if q.get("review_status") == "approved"}
    for filename in IMPORT_FILENAMES.values():
        rows = json.loads((IMPORTS_DIR / filename).read_text(encoding="utf-8"))
        for row in rows:
            if row.get("review_status") != "approved":
                raise SystemExit(f"Non-approved row in {filename}")
            key = (row.get("year"), row.get("exam_day"), row.get("question_number"))
            if key not in approved_keys:
                raise SystemExit(f"Import row not approved in batch: {key}")


def render_report(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# Revisao editorial do lote 001",
        "",
        f"- Total analisado: {summary['total']}",
        f"- Aprovadas: {summary['approved']}",
        f"- Pendentes: {summary['pending']}",
        f"- Rejeitadas: {summary['rejected']}",
        f"- Com midia obrigatoria: {summary['with_media']}",
        f"- Aprovadas com midia: {summary['approved_with_media']}",
        f"- Pendentes com midia: {summary['pending_with_media']}",
        f"- Duplicidade por chave oficial: {len(report['duplicates']['official_key_duplicates'])}",
        f"- Duplicidade por conteudo: {len(report['duplicates']['content_duplicates'])}",
        "",
        "## Itens",
        "",
    ]
    for item in report["items"]:
        reasons = "; ".join(item["pending_or_rejection_reasons"]) or "-"
        coords = item["coordinates"] or {}
        coord_text = (
            f"{coords.get('x0')},{coords.get('y0')},{coords.get('x1')},{coords.get('y1')} {coords.get('unit')}"
            if coords
            else "-"
        )
        lines.append(
            f"- {item['key']} | {item['review_status']} | midia={item['media_required']} | "
            f"tipo={item['media_type'] or '-'} | pagina={item['source_page'] or '-'} | coords={coord_text} | {reasons}"
        )
    return "\n".join(lines) + "\n"


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
