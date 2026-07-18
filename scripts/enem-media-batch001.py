#!/usr/bin/env python3
"""Extract and audit media crops for ENEM editorial batch 001.

This script is scoped to generated batch artifacts and public preview assets.
It records PDF origin, page, crop coordinates, dimensions and validation status
so media extraction is reproducible instead of a set of anonymous manual cuts.
"""

from __future__ import annotations

import json
import math
import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import fitz
except ImportError as exc:  # pragma: no cover
    raise SystemExit("PyMuPDF is required. Install scripts/requirements-enem-pipeline.txt") from exc


ROOT = Path(__file__).resolve().parents[1]
BATCH_DIR = ROOT / "outputs" / "enem-editorial-300" / "batch-001"
QUESTIONS_PATH = BATCH_DIR / "questions.json"
MEDIA_REPORT_JSON = BATCH_DIR / "media-audit-report.json"
MEDIA_REPORT_MD = BATCH_DIR / "media-audit-report.md"
PUBLIC_MEDIA_DIR = ROOT / "public" / "enem-media" / "batch-001"
OUTPUT_MEDIA_DIR = BATCH_DIR / "media"
DOWNLOADS = Path("C:/Users/USER/Downloads")

NOW = datetime.now(timezone.utc).isoformat()


@dataclass
class CropDecision:
    source_pdf: str
    source_page: int
    media_type: str
    required: bool
    rect: tuple[float, float, float, float] | None
    status: str
    reason: str
    crop_strategy: str


# Coordinates are PDF points in the original page coordinate system.
# They were derived from PyMuPDF page geometry, image/drawing blocks and visual
# inspection of the official PDF pages.
DECISIONS: dict[tuple[int, str, str, int], CropDecision] = {
    (2024, "aplicacao regular", "2", 137): CropDecision("2024_PV_impresso_D2_CD6.pdf", 16, "grafico", True, (305, 155, 560, 380), "validated", "Grafico de receitas e reta de tendencia necessario para estimar 2026.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 138): CropDecision("2024_PV_impresso_D2_CD6.pdf", 17, "tabela", True, (35, 170, 295, 235), "validated", "Tabela de custo por quantidade de mochilas necessaria ao calculo.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 142): CropDecision("2024_PV_impresso_D2_CD6.pdf", 18, "grafico", True, (55, 135, 285, 410), "validated", "Grafico de barras empilhadas necessario para comparar faixas etarias.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 146): CropDecision("2024_PV_impresso_D2_CD6.pdf", 20, "diagrama", True, (62, 270, 300, 492), "validated", "Figura do microscopio necessaria para identificar ocular e objetivas.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 148): CropDecision("2024_PV_impresso_D2_CD6.pdf", 20, "diagrama", True, (340, 285, 525, 455), "validated", "Teclado alfanumerico necessario para contar senhas possiveis.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 153): CropDecision("2024_PV_impresso_D2_CD6.pdf", 22, "diagrama", True, (315, 195, 550, 410), "validated", "Imagem dos celulares e diagonais indispensavel para interpretar as medidas.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 155): CropDecision("2024_PV_impresso_D2_CD6.pdf", 23, "diagrama", True, (35, 480, 300, 640), "validated", "Diagrama das polias e correia necessario para o comprimento.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 165): CropDecision("2024_PV_impresso_D2_CD6.pdf", 27, "grafico", True, (305, 155, 565, 335), "validated", "Grafico da temperatura em funcao do tempo necessario para obter constantes.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 168): CropDecision("2024_PV_impresso_D2_CD6.pdf", 28, "diagrama", True, (35, 555, 285, 700), "validated", "Setor circular de cobertura do sensor necessario para calcular a area.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 179): CropDecision("2024_PV_impresso_D2_CD6.pdf", 31, "diagrama", True, (360, 230, 525, 375), "validated", "Trapezio e eixo de rotacao indispensaveis para identificar o solido.", "manual_from_question_region"),
    (2023, "aplicacao regular", "2", 148): CropDecision("2023_PV_impresso_D2_CD5.pdf", 20, "diagrama", True, (345, 365, 535, 490), "validated", "Triangulo magico com circulos necessario para analisar as somas.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 136): CropDecision("2024_PV_impresso_D2_CD6.pdf", 16, "diagrama", True, (30, 245, 295, 355), "validated", "Figura das duas possibilidades de embalagem cilindrica.", "manual_from_question_region"),
    (2023, "aplicacao regular", "2", 164): CropDecision("2023_PV_impresso_D2_CD5.pdf", 26, "diagrama", True, (25, 175, 285, 350), "validated", "Cone original e tronco de cone perfurado necessarios para o volume.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 102): CropDecision("2024_PV_impresso_D2_CD6.pdf", 6, "fotografia", True, (78, 135, 255, 315), "validated", "Placa fotoluminescente indispensavel para contextualizar o fenomeno.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 105): CropDecision("2024_PV_impresso_D2_CD6.pdf", 7, "fotografia", True, (35, 250, 300, 365), "validated", "Fotografias da coral-verdadeira e da falsa-coral indispensaveis.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 114): CropDecision("2024_PV_impresso_D2_CD6.pdf", 9, "diagrama", True, (360, 515, 505, 620), "validated", "Distribuicao bacteriana nos tubos de ensaio necessaria para classificar metabolismo.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 117): CropDecision("2024_PV_impresso_D2_CD6.pdf", 10, "esquema", True, (305, 165, 575, 305), "validated", "Esquema do aquecedor solar e setas de transferencia de energia.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 125): CropDecision("2024_PV_impresso_D2_CD6.pdf", 12, "grafico", True, (315, 365, 555, 610), "validated", "Grafico de gases emitidos em funcao da razao ar/combustivel.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 126): CropDecision("2024_PV_impresso_D2_CD6.pdf", 13, "diagrama", True, (35, 270, 300, 430), "validated", "Esquema do carro com crumple zone, airbag e cintos.", "manual_from_question_region"),
    (2024, "aplicacao regular", "2", 131): CropDecision("2024_PV_impresso_D2_CD6.pdf", 14, "esquema", True, (305, 270, 565, 555), "validated", "Esquema completo do mirascopio com objeto, espelhos e dimensoes.", "manual_from_question_region"),
    (2023, "aplicacao regular", "2", 91): CropDecision("2023_PV_impresso_D2_CD5.pdf", 2, "tirinha", True, (58, 145, 550, 272), "validated", "Tirinha das latas e barbante indispensavel para interpretar a situacao.", "manual_from_question_region"),
    (2023, "aplicacao regular", "2", 94): CropDecision("2023_PV_impresso_D2_CD5.pdf", 3, "diagrama e tabela", True, (110, 235, 505, 455), "validated", "Esquema de ligacao e tabela de eletronegatividade necessarios.", "manual_from_question_region"),
    (2023, "aplicacao regular", "2", 98): CropDecision("2023_PV_impresso_D2_CD5.pdf", 4, "diagrama", True, (315, 195, 545, 375), "validated", "Circuito eletrico com lampadas e resistores indispensavel.", "manual_from_question_region"),
    (2024, "aplicacao regular", "1", 73): CropDecision("2024_PV_impresso_D1_CD1.pdf", 27, "texto diagramado", False, None, "not_required", "O item e textual; nao ha elemento visual indispensavel alem do texto extraido.", "reclassified_text_only"),
    (2024, "aplicacao regular", "1", 75): CropDecision("2024_PV_impresso_D1_CD1.pdf", 27, "texto diagramado", False, None, "not_required", "O item e textual; a palavra-chave de midia foi falso positivo da extracao.", "reclassified_text_only"),
    (2023, "aplicacao regular", "1", 46): CropDecision("2023_PV_impresso_D1_CD1.pdf", 20, "fotografia", True, (70, 115, 250, 390), "validated", "Fotografia da avo bordada indispensavel para relacionar Sertao a vivencias socioafetivas.", "manual_from_question_region"),
    (2023, "aplicacao regular", "1", 50): CropDecision("2023_PV_impresso_D1_CD1.pdf", 21, "texto diagramado", False, None, "not_required", "O item e textual; nao ha elemento visual indispensavel alem do texto extraido.", "reclassified_text_only"),
    (2023, "aplicacao regular", "1", 63): CropDecision("2023_PV_impresso_D1_CD1.pdf", 24, "texto diagramado", False, None, "not_required", "O item e textual; nao ha mapa, grafico ou imagem indispensavel.", "reclassified_text_only"),
    (2023, "aplicacao regular", "1", 76): CropDecision("2023_PV_impresso_D1_CD1.pdf", 27, "grafico", True, (325, 335, 560, 655), "validated", "Grafico de fecundidade no Brasil necessario para responder.", "manual_from_question_region"),
    (2024, "aplicacao regular", "1", 17): CropDecision("2024_PV_impresso_D1_CD1.pdf", 8, "texto diagramado", False, None, "not_required", "O item e textual; menciona fotos/anuncios, mas nao apresenta midia a recortar.", "reclassified_text_only"),
    (2024, "aplicacao regular", "1", 25): CropDecision("2024_PV_impresso_D1_CD1.pdf", 11, "obra de arte", True, (305, 82, 575, 408), "validated", "Pintura Tres meninas no jardim indispensavel para analise estetica.", "manual_from_question_region"),
    (2024, "aplicacao regular", "1", 34): CropDecision("2024_PV_impresso_D1_CD1.pdf", 14, "texto diagramado", False, None, "not_required", "O item e textual; nao ha imagem, anuncio ou grafico na questao.", "reclassified_text_only"),
    (2024, "aplicacao regular", "1", 36): CropDecision("2024_PV_impresso_D1_CD1.pdf", 15, "obra de arte", True, (45, 392, 535, 655), "validated", "Duas esculturas comparadas visualmente; recorte inclui Texto I e Texto II.", "manual_from_question_region"),
    (2024, "aplicacao regular", "1", 40): CropDecision("2024_PV_impresso_D1_CD1.pdf", 17, "texto diagramado", False, None, "not_required", "O item e textual; nao apresenta anuncio ou imagem no PDF.", "reclassified_text_only"),
    (2023, "aplicacao regular", "1", 36): CropDecision("2023_PV_impresso_D1_CD1.pdf", 16, "texto diagramado", False, None, "not_required", "O item e textual; nao ha tirinha ou imagem na pagina.", "reclassified_text_only"),
}


def main() -> int:
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))["questions"]
    OUTPUT_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    clear_generated_media()

    report_items: list[dict[str, Any]] = []
    for question in questions:
        key = decision_key(question)
        decision = DECISIONS.get(key)
        if decision is None:
            if question.get("review_status") == "approved" and not question.get("media_required"):
                continue
            mark_pending(question, "Sem decisao de midia registrada para este item.")
            continue

        if not decision.required:
            question["media_required"] = False
            question["media_verified"] = True
            question["media_metadata"] = {
                "required": False,
                "media_type": decision.media_type,
                "validation_status": decision.status,
                "pending_reason": None,
                "reason": decision.reason,
                "crop_strategy": decision.crop_strategy,
            }
            report_items.append(item_report(question, decision, None))
            continue

        crop_info = crop_media(question, decision)
        question["media_required"] = True
        question["media_verified"] = decision.status == "validated"
        question["media_url"] = crop_info["public_url"]
        question["media_alt"] = media_alt(question, decision)
        question["media_metadata"] = {
            **crop_info,
            "required": True,
            "media_type": decision.media_type,
            "validation_status": decision.status,
            "pending_reason": None if decision.status == "validated" else decision.reason,
            "reason": decision.reason,
            "crop_strategy": decision.crop_strategy,
        }
        report_items.append(item_report(question, decision, crop_info))

    write_json(QUESTIONS_PATH, {"questions": questions})
    report = build_report(questions, report_items)
    write_json(MEDIA_REPORT_JSON, report)
    write_text(MEDIA_REPORT_MD, render_report(report))
    print(f"Midias processadas: {report['summary']['media_files_generated']}")
    print(f"Reclassificadas sem midia: {report['summary']['reclassified_not_required']}")
    print(f"Relatorio: {MEDIA_REPORT_MD}")
    return 0


def decision_key(question: dict[str, Any]) -> tuple[int, str, str, int]:
    return (
        int(question.get("year") or 0),
        str(question.get("application") or ""),
        str(question.get("exam_day") or ""),
        int(question.get("question_number") or 0),
    )


def crop_media(question: dict[str, Any], decision: CropDecision) -> dict[str, Any]:
    assert decision.rect is not None
    source_pdf = DOWNLOADS / decision.source_pdf
    doc = fitz.open(source_pdf)
    page = doc[decision.source_page - 1]
    page_rect = page.rect
    rect = fitz.Rect(*decision.rect) & page_rect
    if rect.is_empty or rect.width < 20 or rect.height < 20:
        raise SystemExit(f"Invalid crop for {identity(question)}: {rect}")

    filename = deterministic_filename(question, decision.media_type)
    output_path = OUTPUT_MEDIA_DIR / filename
    public_path = PUBLIC_MEDIA_DIR / filename
    pix = page.get_pixmap(clip=rect, matrix=fitz.Matrix(2.5, 2.5), alpha=False)
    pix.save(output_path)
    pix.save(public_path)
    return {
        "source_pdf": str(source_pdf),
        "source_pdf_file": decision.source_pdf,
        "source_page": decision.source_page,
        "coordinates": {
            "x0": round(rect.x0, 2),
            "y0": round(rect.y0, 2),
            "x1": round(rect.x1, 2),
            "y1": round(rect.y1, 2),
            "unit": "pdf_points",
        },
        "page_size": {"width": round(page_rect.width, 2), "height": round(page_rect.height, 2), "unit": "pdf_points"},
        "file_name": filename,
        "output_path": str(output_path),
        "public_path": str(public_path),
        "public_url": f"/enem-media/batch-001/{filename}",
        "width": pix.width,
        "height": pix.height,
    }


def clear_generated_media() -> None:
    for directory in (OUTPUT_MEDIA_DIR, PUBLIC_MEDIA_DIR):
        for path in directory.glob("enem_*.png"):
            path.unlink()


def deterministic_filename(question: dict[str, Any], media_type: str) -> str:
    booklet = normalize_filename(str(question.get("booklet") or "caderno"))
    media = normalize_filename(media_type)
    return f"enem_{question.get('year')}_d{question.get('exam_day')}_{booklet}_q{int(question.get('question_number') or 0):03d}_{media}.png"


def normalize_filename(value: str) -> str:
    text = value.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


def media_alt(question: dict[str, Any], decision: CropDecision) -> str:
    return f"{decision.media_type} da questao {question.get('question_number')} do ENEM {question.get('year')}"


def mark_pending(question: dict[str, Any], reason: str) -> None:
    question["review_status"] = "pending"
    question["reviewed"] = False
    question["media_verified"] = False
    blockers = question.get("approval_blockers") or []
    if reason not in blockers:
        blockers.append(reason)
    question["approval_blockers"] = blockers


def item_report(question: dict[str, Any], decision: CropDecision, crop_info: dict[str, Any] | None) -> dict[str, Any]:
    return {
        "question": identity(question),
        "media_type": decision.media_type,
        "required": decision.required,
        "validation_status": decision.status,
        "reason": decision.reason,
        "file_name": crop_info.get("file_name") if crop_info else None,
        "public_url": crop_info.get("public_url") if crop_info else None,
        "source_pdf": decision.source_pdf,
        "source_page": decision.source_page,
        "coordinates": crop_info.get("coordinates") if crop_info else None,
        "width": crop_info.get("width") if crop_info else None,
        "height": crop_info.get("height") if crop_info else None,
    }


def identity(question: dict[str, Any]) -> str:
    return (
        f"{question.get('year')} {question.get('application')} D{question.get('exam_day')} "
        f"{question.get('booklet')} Q{question.get('question_number')}"
    )


def build_report(questions: list[dict[str, Any]], items: list[dict[str, Any]]) -> dict[str, Any]:
    media_items = [item for item in items if item["required"]]
    reclassified = [item for item in items if not item["required"]]
    status = Counter(q.get("review_status") for q in questions)
    return {
        "generated_at": NOW,
        "summary": {
            "questions_total": len(questions),
            "approved": status.get("approved", 0),
            "pending": status.get("pending", 0),
            "rejected": status.get("rejected", 0),
            "media_files_generated": len(media_items),
            "reclassified_not_required": len(reclassified),
            "validated_media": sum(1 for item in media_items if item["validation_status"] == "validated"),
        },
        "items": items,
    }


def render_report(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# Auditoria de midias do lote 001",
        "",
        f"- Midias geradas: {summary['media_files_generated']}",
        f"- Midias validadas: {summary['validated_media']}",
        f"- Reclassificadas como sem midia obrigatoria: {summary['reclassified_not_required']}",
        "",
        "| questao | tipo | obrigatoria | status | arquivo | pagina | coordenadas | motivo |",
        "| --- | --- | --- | --- | --- | ---: | --- | --- |",
    ]
    for item in report["items"]:
        coords = item["coordinates"]
        coord_text = "-"
        if coords:
            coord_text = f"{coords['x0']},{coords['y0']},{coords['x1']},{coords['y1']} pt"
        lines.append(
            f"| {item['question']} | {item['media_type']} | {item['required']} | {item['validation_status']} | "
            f"{item['file_name'] or '-'} | {item['source_page']} | {coord_text} | {item['reason']} |"
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
