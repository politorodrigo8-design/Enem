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
    booklet = "CD1" if question["exam_day"] == "1" else "CD7"
    return PROVAS_DIR / f"{question['year']}_PV_impresso_D{question['exam_day']}_{booklet}.pdf"


def page_words_in_order(page: fitz.Page) -> list[tuple]:
    """Words sorted by PDF content order (block/line/word), which follows the
    column reading order used by the text extraction pipeline."""
    return sorted(page.get_text("words"), key=lambda w: (w[5], w[6], w[7]))


def collect_page_markers(words: list[tuple]) -> list[dict]:
    markers = []
    for index, word in enumerate(words):
        if not re.fullmatch(r"(?i)quest(?:a|ã)o", word[4]):
            continue
        if index + 1 >= len(words) or not re.fullmatch(r"0*\d{1,3}", words[index + 1][4]):
            continue
        markers.append({"number": int(words[index + 1][4]), "word_index": index})
    return markers


def question_region(page: fitz.Page, words: list[tuple], start_index: int, end_index: int) -> fitz.Rect | None:
    """Union of every word between the two markers, expanded with any vector
    drawing or raster image whose center falls inside the resulting band —
    figures are not words and would otherwise be cropped out."""
    span = words[start_index:end_index]
    if not span:
        return None
    bbox = fitz.Rect(span[0][:4])
    for word in span[1:]:
        bbox |= fitz.Rect(word[:4])

    graphic_rects = [fitz.Rect(d["rect"]) for d in page.get_drawings()]
    for image_info in page.get_image_info():
        graphic_rects.append(fitz.Rect(image_info["bbox"]))
    for rect in graphic_rects:
        center_y = (rect.y0 + rect.y1) / 2
        center_x = (rect.x0 + rect.x1) / 2
        if bbox.y0 - 6 <= center_y <= bbox.y1 + 6 and bbox.x0 - 30 <= center_x <= bbox.x1 + 30:
            bbox |= rect

    bbox = fitz.Rect(
        max(bbox.x0 - 6, 0),
        max(bbox.y0 - 6, 0),
        min(bbox.x1 + 6, page.rect.width),
        min(bbox.y1 + 6, page.rect.height),
    )
    return bbox


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
    page_cache: dict[tuple[Path, int], tuple[list[tuple], list[dict]]] = {}

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
            words = page_words_in_order(page)
            page_cache[cache_key] = (words, collect_page_markers(words))
        words, page_markers = page_cache[cache_key]

        candidates = [m for m in page_markers if m["number"] == int(question["question_number"])]
        if not candidates:
            failures.append(f"{key}: marcador nao encontrado na pagina {page_index + 1}")
            continue
        # Foreign-language questions 1-5 appear twice: EN block first, ES second.
        occurrence = 1 if question.get("language") == "es" and len(candidates) > 1 else 0
        marker = candidates[min(occurrence, len(candidates) - 1)]
        marker_position = page_markers.index(marker)
        end_index = (
            page_markers[marker_position + 1]["word_index"]
            if marker_position + 1 < len(page_markers)
            else len(words)
        )

        rect = question_region(page, words, marker["word_index"], end_index)
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
