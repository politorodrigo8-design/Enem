#!/usr/bin/env python3
"""Extract question-region images from the official ENEM PDFs.

For every preview question flagged media_required (figure/graph/diagram based,
including questions whose ALTERNATIVES are diagrams), renders the question's
region of the original page as a PNG under public/enem-media/oficial/ and
writes outputs/editorial-work/media-map.json mapping question key -> media
metadata. The editorial apply script consumes that map.

The ENEM page is two-column: the question block is bounded horizontally by its
column and vertically from its "Questão N" marker to the next marker in the
same column (or the column bottom).
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PREVIEW = ROOT / "outputs" / "enem-pilot-2026-07-14" / "questions-preview.json"
DEFAULT_MEDIA_DIR = ROOT / "public" / "enem-media" / "oficial"
DEFAULT_MAP = ROOT / "outputs" / "editorial-work" / "media-map.json"
PROVAS_DIR = ROOT / "provas-oficiais"

ZOOM = 2.0
MARKER_RE = re.compile(r"(?i)quest(?:a|ã)o\s+0*(\d{1,3})\b")


def question_key(question: dict) -> str:
    key = f"{question['year']}-D{question['exam_day']}-Q{int(question['question_number']):03d}"
    if question.get("language"):
        key += f"-{question['language']}"
    return key


def proof_path(question: dict) -> Path:
    # Prefer the record's own source_pdf: the CD1/CD7 heuristic below is wrong for
    # cadernos like 2021 D1 (CD4), whose question numbering differs from CD1.
    source_pdf = question.get("source_pdf")
    if source_pdf:
        return PROVAS_DIR / source_pdf
    booklet = "CD1" if question["exam_day"] == "1" else "CD7"
    return PROVAS_DIR / f"{question['year']}_PV_impresso_D{question['exam_day']}_{booklet}.pdf"


def collect_page_markers(page: fitz.Page) -> list[dict]:
    """Marcadores 'Questao N' com posicao (x, y). Procura o numero na mesma linha do
    'Questao' (ate 4 tokens a frente), robusto a ordem de get_text('words')."""
    words = page.get_text("words")
    markers = []
    for index, word in enumerate(words):
        if not re.fullmatch(r"(?i)quest(?:a|ã)o", word[4]):
            continue
        number = None
        for j in range(index + 1, min(index + 5, len(words))):
            cand = words[j]
            if abs(cand[1] - word[1]) > 6:
                continue
            if re.fullmatch(r"0*\d{1,3}", cand[4]):
                number = int(cand[4])
                break
            if not re.fullmatch(r"[-–—|•\s]*", cand[4]):
                break
        if number is None:
            continue
        markers.append({"number": number, "x": word[0], "y": word[1]})
    return markers


def question_region(page: fitz.Page, marker: dict, all_markers: list[dict]) -> fitz.Rect | None:
    """Regiao de UMA questao numa pagina de 2 colunas: da linha do marcador ate o proximo
    marcador da MESMA coluna (ou fim da coluna), limitada horizontalmente a coluna quando ha
    outra questao na coluna oposta. Graficos grandes (regua divisoria, borda) sao recortados a
    banda antes da uniao, senao arrastariam a bbox para a pagina inteira."""
    W, H = page.rect.width, page.rect.height
    mid = W / 2
    left = marker["x"] < mid
    x0, x1 = (0, mid) if left else (mid, W)
    y0 = marker["y"] - 2
    below = [m["y"] for m in all_markers if (m["x"] < mid) == left and m["y"] > marker["y"] + 5]
    y1 = min(below) if below else H
    other_col = any((m["x"] < mid) != left and y0 <= m["y"] <= y1 for m in all_markers)
    band = fitz.Rect(x0, y0, x1, y1)

    content = None
    for w in page.get_text("words"):
        r = fitz.Rect(w[:4])
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        if band.x0 <= cx <= band.x1 and band.y0 <= cy <= band.y1:
            content = r if content is None else content | r
    graphics = [fitz.Rect(d["rect"]) for d in page.get_drawings()]
    for image_info in page.get_image_info():
        graphics.append(fitz.Rect(image_info["bbox"]))
    for r in graphics:
        if r.width < 4 or r.height < 4:
            continue
        clip = r & band
        if clip.is_empty or clip.width < 4 or clip.height < 4:
            continue
        content = clip if content is None else content | clip
    if content is None:
        return None
    content = content & fitz.Rect(x0 - 40, y0 - 4, x1 + 40, y1 + 4)
    if content.is_empty:
        return None

    if other_col:
        lo = 0 if left else mid - 8
        hi = mid + 8 if left else W
        cx0, cx1 = max(content.x0 - 6, lo), min(content.x1 + 6, hi)
    else:
        cx0, cx1 = max(content.x0 - 6, 0), min(content.x1 + 6, W)
    return fitz.Rect(cx0, max(content.y0 - 6, 0), cx1, min(content.y1 + 6, H))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", default=str(DEFAULT_PREVIEW))
    parser.add_argument("--media-dir", default=str(DEFAULT_MEDIA_DIR))
    parser.add_argument("--map", default=str(DEFAULT_MAP))
    args = parser.parse_args()

    preview = json.loads(Path(args.preview).read_text(encoding="utf-8"))
    targets = [
        q
        for q in preview["questions"]
        if q.get("media_required")
        and not q.get("is_annulled")
        and not q.get("duplicate")
        and q.get("statement")
    ]
    media_dir = Path(args.media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)

    media_map: dict[str, dict] = {}
    failures: list[str] = []
    docs: dict[Path, fitz.Document] = {}
    page_cache: dict[tuple[Path, int], list[dict]] = {}

    for question in targets:
        key = question_key(question)
        pdf_path = proof_path(question)
        if pdf_path not in docs:
            docs[pdf_path] = fitz.open(pdf_path)
        doc = docs[pdf_path]
        page_index = int(question.get("page") or 1) - 1
        if not 0 <= page_index < doc.page_count:
            failures.append(f"{key}: pagina {page_index + 1} inexistente")
            continue
        page = doc[page_index]
        cache_key = (pdf_path, page_index)
        if cache_key not in page_cache:
            page_cache[cache_key] = collect_page_markers(page)
        page_markers = page_cache[cache_key]

        candidates = [m for m in page_markers if m["number"] == int(question["question_number"])]
        if not candidates:
            failures.append(f"{key}: marcador nao encontrado na pagina {page_index + 1}")
            continue
        # Foreign-language questions 1-5 appear twice: EN block first, ES second.
        occurrence = 1 if question.get("language") == "es" and len(candidates) > 1 else 0
        marker = candidates[min(occurrence, len(candidates) - 1)]

        rect = question_region(page, marker, page_markers)
        if rect is None or rect.height < 40:
            failures.append(f"{key}: regiao invalida")
            continue
        pixmap = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=rect)
        filename = f"{key}.png"
        pixmap.save(media_dir / filename)
        media_map[key] = {
            "media_url": f"/enem-media/oficial/{filename}",
            "media_type": "image",
            "media_alt": f"Reprodução da questão {question['question_number']} do ENEM {question['year']} (caderno azul) com o material visual original.",
            "media_caption": f"ENEM {question['year']} — questão {question['question_number']} (reprodução do caderno oficial).",
            "media_width": pixmap.width,
            "media_height": pixmap.height,
            "source_page": page_index + 1,
        }

    for doc in docs.values():
        doc.close()

    Path(args.map).write_text(json.dumps(media_map, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(media_map)} imagens geradas em {media_dir}")
    if failures:
        print(f"{len(failures)} falhas:")
        for failure in failures:
            print(f"  - {failure}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
