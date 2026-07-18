#!/usr/bin/env python3
"""Build the safe editorial preview for the first official ENEM pilot batch.

The default run is intentionally conservative:
- it inventories every attached PDF;
- it matches proofs to attached answer keys when possible;
- it processes only the two most recent complete confirmed years, up to four pairs;
- it writes empty Supabase import files unless rows are approved and verified.

Install dependency in the ignored work directory:
  python -m venv work\\pdf-venv
  .\\work\\pdf-venv\\Scripts\\python.exe -m pip install -r scripts\\requirements-enem-pipeline.txt

Run:
  .\\work\\pdf-venv\\Scripts\\python.exe scripts\\enem-pilot-pipeline.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import fitz  # PyMuPDF
except ImportError as exc:  # pragma: no cover - exercised by local environment
    raise SystemExit(
        "PyMuPDF is required. Run: "
        "python -m pip install -r scripts/requirements-enem-pipeline.txt"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "scripts" / "enem-pilot-sources.json"
DEFAULT_OUTPUT_DIR = ROOT / "outputs" / "enem-pilot-2026-07-14"
DEFAULT_IMPORTS_DIR = ROOT / "supabase" / "imports"

IMPORT_FILENAMES = {
    "Matematica": "enem-piloto-matematica.json",
    "Ciencias da Natureza": "enem-piloto-natureza.json",
    "Ciencias Humanas": "enem-piloto-humanas.json",
    "Linguagens": "enem-piloto-linguagens.json",
}

AREA_BY_RANGE = [
    (1, 45, "Linguagens"),
    (46, 90, "Ciencias Humanas"),
    (91, 135, "Ciencias da Natureza"),
    (136, 180, "Matematica"),
]

MAX_PROCESSED_PAIRS = 4
PILOT_QUOTAS = {
    "Matematica": 15,
    "Ciencias da Natureza": 10,
    "Ciencias Humanas": 8,
    "Linguagens": 7,
}

PRIORITY_WEIGHTS = {
    "historical_recurrence_weight": 25,
    "years_diversity_weight": 15,
    "skill_frequency_weight": 15,
    "charging_pattern_weight": 15,
    "recent_exam_weight": 10,
    "strategic_relevance_weight": 10,
    "extraction_quality_weight": 5,
    "editorial_confidence_weight": 5,
}

FORBIDDEN_PRIORITY_LANGUAGE = [
    "vai cair",
    "questao garantida",
    "tema confirmado",
    "previsao certa",
]

TOPIC_RULES = [
    ("Matematica", "porcent|percent|propor|razao|escala", "Razao, proporcao e porcentagem", "Proporcionalidade"),
    ("Matematica", "grafico|tabela|coluna|linha|pizza", "Interpretacao de graficos e tabelas", "Leitura de dados"),
    ("Matematica", "media|mediana|moda|desvio|estatistic", "Estatistica", "Medidas estatisticas"),
    ("Matematica", "area|perimetro|triangulo|circulo|quadrado|retangulo|poligono", "Geometria plana", "Areas e medidas"),
    ("Matematica", "volume|cilindro|cone|prisma|esfera", "Geometria espacial", "Solidos geometricos"),
    ("Matematica", "funcao|afim|quadratica|exponencial", "Funcoes", "Modelagem por funcoes"),
    ("Matematica", "juros|taxa|financ", "Matematica financeira", "Juros e taxas"),
    ("Matematica", "probabilidade|chance|aleatori", "Probabilidade", "Eventos probabilisticos"),
    ("Ciencias da Natureza", "ecolog|cadeia alimentar|ecossistema|impacto ambiental|biodiversidade", "Ecologia", "Relacoes ecologicas"),
    ("Ciencias da Natureza", "gene|genetic|alelo|heredograma|dna", "Genetica", "Hereditariedade"),
    ("Ciencias da Natureza", "energia|potencia|trabalho|eletric|circuito|tensao|corrente", "Fisica", "Energia e eletricidade"),
    ("Ciencias da Natureza", "onda|som|frequencia|optica|luz", "Fisica", "Ondas e optica"),
    ("Ciencias da Natureza", "solucao|concentracao|mol|estequiometr|ph|eletroquim|organica", "Quimica", "Transformacoes e substancias"),
    ("Ciencias Humanas", "republica|vargas|ditadura|escrav|coloniz|imperio", "Historia", "Historia do Brasil"),
    ("Ciencias Humanas", "urbaniz|globaliz|geopolit|migrac|clima|cartograf|agro|energia", "Geografia", "Espaco geografico"),
    ("Ciencias Humanas", "democracia|cidadania|estado|poder|etica|trabalho|cultura|desigualdade", "Filosofia e Sociologia", "Politica e sociedade"),
    ("Linguagens", "cartaz|campanha|publicidade|anuncio|midi", "Publicidade e midia", "Linguagem persuasiva"),
    ("Linguagens", "poema|poesia|literatura|romance|conto|cronica", "Literatura", "Leitura literaria"),
    ("Linguagens", "charge|tirinha|cartum|imagem|verbal|nao verbal", "Linguagem verbal e nao verbal", "Multimodalidade"),
    ("Linguagens", "texto|autor|leitor|sentido|genero textual", "Interpretacao textual", "Compreensao de texto"),
]


@dataclass
class PdfText:
    pages: list[str]
    metadata: dict[str, Any]
    image_counts: list[int]

    @property
    def all_text(self) -> str:
        return "\n".join(self.pages)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--imports-dir", default=str(DEFAULT_IMPORTS_DIR))
    parser.add_argument(
        "--allow-unverified-extraction",
        action="store_true",
        help="Extract question text even when answer keys are missing. Default keeps extraction blocked.",
    )
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    output_dir = Path(args.output_dir).resolve()
    imports_dir = Path(args.imports_dir).resolve()
    paths, ignored_paths = load_manifest(manifest_path)

    output_dir.mkdir(parents=True, exist_ok=True)
    imports_dir.mkdir(parents=True, exist_ok=True)

    inventory = build_inventory(paths, ignored_paths)
    match_answer_keys(inventory)
    processed_pairs = select_pairs_to_process(inventory)
    matches = build_match_table(inventory)
    questions = build_question_preview(inventory, processed_pairs, args.allow_unverified_extraction)
    recurrence_table = build_recurrence_table(questions)
    selected = select_pilot_questions(questions)
    imports = build_import_payloads(selected)
    report = build_preview_report(inventory, matches, processed_pairs, questions, recurrence_table, selected)

    write_json(output_dir / "inventory.json", inventory)
    write_text(output_dir / "inventory.md", render_inventory_md(inventory))
    write_json(output_dir / "proof-answer-key-matches.json", matches)
    write_text(output_dir / "proof-answer-key-matches.md", render_matches_md(matches))
    write_json(output_dir / "processed-pairs.json", processed_pairs)
    write_json(output_dir / "questions-preview.json", {"questions": questions})
    write_json(output_dir / "recurrence-table.json", recurrence_table)
    write_json(output_dir / "priority-weights.json", build_priority_policy())
    write_json(output_dir / "selected-pilot-questions.json", {"questions": selected})
    write_json(output_dir / "preview-report.json", report)
    write_text(output_dir / "preview-report.md", render_preview_md(report, recurrence_table, selected))
    write_text(output_dir / "future-300-questions.md", render_future_plan_md())

    for area, filename in IMPORT_FILENAMES.items():
        write_json(imports_dir / filename, imports[area])

    print(f"Inventory files: {len(inventory)}")
    print(f"Answer key files: {report['files']['answer_key_files']}")
    print(f"Unique proof files: {report['files']['unique_proof_files']}")
    print(f"Question markers found in unique proofs: {report['questions']['found_unique_by_markers']}")
    print(f"Questions extracted: {report['questions']['extracted']}")
    print(f"Questions approved for import: {report['questions']['approved']}")
    print(f"Output directory: {output_dir}")
    print(f"Import files directory: {imports_dir}")
    if report["blockers"]:
        print("Blockers:")
        for blocker in report["blockers"]:
            print(f"- {blocker}")
    return 0


def load_manifest(manifest_path: Path) -> tuple[list[Path], list[Path]]:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    files = data.get("files", [])
    ignored_files = data.get("ignored_files", [])
    return [Path(file).resolve() for file in files], [Path(file).resolve() for file in ignored_files]


def build_inventory(paths: list[Path], ignored_paths: list[Path]) -> list[dict[str, Any]]:
    inventory: list[dict[str, Any]] = []
    seen_hashes: dict[str, str] = {}

    for path in ignored_paths:
        inventory.append(
            {
                "file_name": path.name,
                "file_path": str(path),
                "exists": path.exists(),
                "type": "ignored",
                "year": None,
                "year_candidates": [],
                "application": None,
                "exam_day": None,
                "booklet": None,
                "question_count": 0,
                "answer_count": 0,
                "answer_key_file": None,
                "matched_proof_file": None,
                "relevant_pages": [],
                "problems": ["Arquivo ignorado por solicitacao do usuario."],
                "identification_confidence": "alta",
                "association_confidence": "unmatched",
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None,
                "duplicate_of": None,
                "source_verified": False,
                "answer_verified": False,
            }
        )

    for path in paths:
        item: dict[str, Any] = {
            "file_name": path.name,
            "file_path": str(path),
            "exists": path.exists(),
            "type": "unknown",
            "year": None,
            "year_candidates": [],
            "application": None,
            "exam_day": None,
            "booklet": None,
            "question_count": 0,
            "answer_count": 0,
            "answer_key_file": None,
            "matched_proof_file": None,
            "answer_numbers": [],
            "annulled_questions": [],
            "relevant_pages": [],
            "problems": [],
            "identification_confidence": "baixa",
            "association_confidence": "unmatched",
            "sha256": None,
            "duplicate_of": None,
            "source_verified": False,
            "answer_verified": False,
        }

        if not path.exists():
            item["problems"].append("Arquivo anexado nao encontrado no caminho informado.")
            inventory.append(item)
            continue

        raw = path.read_bytes()
        sha = hashlib.sha256(raw).hexdigest()
        item["sha256"] = sha
        if sha in seen_hashes:
            item["duplicate_of"] = seen_hashes[sha]
            item["problems"].append(f"Duplicata byte a byte de {seen_hashes[sha]}.")
        else:
            seen_hashes[sha] = path.name

        pdf = read_pdf(path)
        text = pdf.all_text
        item["type"] = identify_file_type(path, text)
        item["year"], item["year_candidates"] = identify_year(path, pdf.metadata)
        item["application"] = identify_application(path, text)
        item["exam_day"] = identify_day(path, text)
        item["booklet"] = identify_booklet(path, text)
        item["question_numbers"] = extract_question_numbers(text)
        item["question_count"] = len(item["question_numbers"])
        if item["type"] == "gabarito":
            answer_map = parse_answer_key_text(text)
            item["answer_numbers"] = sorted(answer_map)
            item["answer_count"] = len(answer_map)
            item["annulled_questions"] = sorted(
                number for number, answer in answer_map.items() if answer == "Anulado"
            )
            item["question_count"] = item["answer_count"]
        item["relevant_pages"] = find_question_pages(pdf.pages)
        if item["type"] == "gabarito":
            item["relevant_pages"] = list(range(1, len(pdf.pages) + 1))
        item["page_count"] = len(pdf.pages)
        item["image_count"] = sum(pdf.image_counts)
        item["metadata"] = safe_metadata(pdf.metadata)
        item["source_verified"] = item["type"] == "prova" and item["question_count"] == 90

        if item["type"] == "prova" and item["question_count"] != 90:
            item["problems"].append("Quantidade de marcadores de questao diferente de 90.")
        if item["type"] == "gabarito" and item["answer_count"] != 90:
            item["problems"].append("Quantidade de respostas diferente de 90.")
        if item["type"] == "prova" and item["answer_key_file"] is None:
            item["problems"].append("Gabarito correspondente ainda nao identificado entre os anexos.")
        if item["year"] is None:
            item["problems"].append("Ano nao identificado com seguranca pelo nome do arquivo.")

        item["identification_confidence"] = confidence_for(item)
        inventory.append(item)

    return inventory


def read_pdf(path: Path) -> PdfText:
    doc = fitz.open(path)
    pages: list[str] = []
    image_counts: list[int] = []
    for page in doc:
        pages.append(page.get_text("text"))
        image_counts.append(len(page.get_images(full=True)))
    return PdfText(pages=pages, metadata=dict(doc.metadata or {}), image_counts=image_counts)


def identify_file_type(path: Path, text: str) -> str:
    name = normalize(path.stem)
    normalized_text = normalize(text[:4000])
    if re.search(r"(^|[_\-\s])(gabarito|answer|answers|gb)([_\-\s]|$)", name):
        return "gabarito"
    if "gabarito" in normalized_text and "questao" in normalized_text:
        return "gabarito"
    if "caderno de questoes" in normalized_text or "questoes numeradas" in normalized_text:
        return "prova"
    if extract_question_numbers(text):
        return "prova"
    return "unknown"


def identify_year(path: Path, metadata: dict[str, Any]) -> tuple[int | None, list[int]]:
    name_match = re.search(r"(?<!\d)(20\d{2})(?!\d)", path.name)
    if name_match:
        return int(name_match.group(1)), [int(name_match.group(1))]

    candidates: list[int] = []
    for key in ("creationDate", "modDate"):
        value = str(metadata.get(key) or "")
        match = re.search(r"D:(20\d{2})", value)
        if match:
            candidates.append(int(match.group(1)))
    return None, sorted(set(candidates))


def identify_application(path: Path, text: str) -> str | None:
    name = normalize(path.name)
    excerpt = normalize(text[:4000])
    if "reaplicacao" in name or "ppl" in name or "2a aplicacao" in excerpt or "2 aplicacao" in excerpt:
        return "reaplicacao/PPL"
    if "aplicacao_regular" in name or "impresso" in name or "1a aplicacao" in excerpt:
        return "aplicacao regular"
    return None


def identify_day(path: Path, text: str) -> str | None:
    name = normalize(path.name)
    excerpt = normalize(text[:4000])
    if re.search(r"(^|_)d1(_|\.|$)", name) or "1_dia" in name or "1o dia" in excerpt:
        return "1"
    if re.search(r"(^|_)d2(_|\.|$)", name) or "2_dia" in name or "2o dia" in excerpt:
        return "2"
    return None


def identify_booklet(path: Path, text: str) -> str | None:
    name = normalize(path.name)
    caderno = None
    color = None

    cd_match = re.search(r"cd(\d+)", name)
    if cd_match:
        caderno = cd_match.group(1)
    caderno_match = re.search(r"caderno[_ -](?:de[_ -]questoes[_ -])?(?:\d[_ -]dia[_ -])?caderno[_ -](\d+)", name)
    if caderno_match:
        caderno = caderno_match.group(1)

    question_start = re.search(r"(?i)quest(?:a|ã)o\s+0*\d{1,3}\b", text)
    cover_text = text[: question_start.start()] if question_start else text[:2500]
    normalized_cover = normalize(cover_text)

    explicit_cover = re.search(
        r"caderno\s*(\d+)?\s*(azul|amarelo|cinza|rosa|verde|branco)|"
        r"(azul|amarelo|cinza|rosa|verde|branco)\s*(\d+)?",
        normalized_cover,
    )
    if explicit_cover:
        color = explicit_cover.group(2) or explicit_cover.group(3)

    code_color = re.search(r"\b\d{6}(AZ|AM|CZ|RS|VD|BR)\d\b", cover_text.upper())
    if color is None and code_color:
        color = {
            "AZ": "azul",
            "AM": "amarelo",
            "CZ": "cinza",
            "RS": "rosa",
            "VD": "verde",
            "BR": "branco",
        }.get(code_color.group(1))

    normalized_all = normalize(text)
    if color is None and "gabarito" in normalized_all:
        for candidate in ("azul", "amarelo", "cinza", "rosa", "verde", "branco"):
            if re.search(rf"\b{candidate}\b", normalized_all):
                color = candidate
                break

    for candidate in ("azul", "amarelo", "cinza", "rosa", "verde", "branco"):
        if re.search(rf"\b{candidate}\b", name) or (
            color is None and re.search(rf"\b{candidate}\b", normalized_cover)
        ):
            color = candidate
            break

    if caderno and color:
        return f"Caderno {caderno} - {color.upper()}"
    if caderno:
        return f"Caderno {caderno}"
    if color:
        return color.upper()
    return None


def extract_question_numbers(text: str) -> list[int]:
    normalized = normalize(text)
    numbers = {
        int(match.group(1))
        for match in re.finditer(r"questao\s+0*(\d{1,3})\b", normalized, flags=re.I)
    }
    return sorted(number for number in numbers if 1 <= number <= 180)


def find_question_pages(pages: list[str]) -> list[int]:
    result = []
    for index, text in enumerate(pages, start=1):
        if extract_question_numbers(text):
            result.append(index)
    return result


def confidence_for(item: dict[str, Any]) -> str:
    if not item["exists"]:
        return "baixa"
    if item["duplicate_of"]:
        return "alta"
    has_core = item["type"] == "prova" and item["exam_day"] and item["booklet"] and item["question_count"] == 90
    if has_core and item["year"]:
        return "alta"
    if has_core:
        return "media"
    return "baixa"


def match_answer_keys(inventory: list[dict[str, Any]]) -> None:
    answer_keys = [item for item in inventory if item["type"] == "gabarito" and not item["duplicate_of"]]
    proofs = [item for item in inventory if item["type"] == "prova" and not item["duplicate_of"]]

    for proof in proofs:
        matches = [
            key
            for key in answer_keys
            if key.get("year") == proof.get("year")
            and key.get("exam_day") == proof.get("exam_day")
            and key.get("application") == proof.get("application")
            and key.get("booklet") == proof.get("booklet")
            and key.get("answer_count") == 90
        ]
        if len(matches) == 1:
            proof["answer_key_file"] = matches[0]["file_name"]
            proof["answer_verified"] = True
            proof["association_confidence"] = "alta"
            proof["association_observation"] = "Ano, aplicacao, dia, caderno e 90 respostas conferem."
            matches[0]["matched_proof_file"] = proof["file_name"]
            matches[0]["answer_verified"] = True
            matches[0]["association_confidence"] = "alta"
            proof["problems"] = [
                problem
                for problem in proof["problems"]
                if problem != "Gabarito correspondente ainda nao identificado entre os anexos."
            ]
        elif matches:
            proof["association_observation"] = "Mais de um gabarito candidato; mantido unmatched."
        else:
            proof["association_observation"] = "Nenhum gabarito com ano, aplicacao, dia e caderno equivalentes."


def build_match_table(inventory: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for proof in sorted(
        [item for item in inventory if item["type"] == "prova" and not item.get("duplicate_of")],
        key=lambda item: (item.get("year") or 0, item.get("application") or "", item.get("exam_day") or "", item["file_name"]),
    ):
        rows.append(
            {
                "proof_file": proof["file_name"],
                "answer_key_file": proof.get("answer_key_file"),
                "year": proof.get("year"),
                "exam_day": proof.get("exam_day"),
                "application": proof.get("application"),
                "booklet": proof.get("booklet"),
                "association_confidence": proof.get("association_confidence", "unmatched"),
                "processed": bool(proof.get("processing_selected")),
                "observations": proof.get("association_observation") or "; ".join(proof.get("problems") or []),
            }
        )
    return rows


def select_pairs_to_process(inventory: list[dict[str, Any]]) -> list[dict[str, Any]]:
    confirmed = [
        item
        for item in inventory
        if item["type"] == "prova"
        and not item.get("duplicate_of")
        and item.get("answer_key_file")
        and item.get("association_confidence") == "alta"
        and item.get("application") == "aplicacao regular"
    ]
    by_year: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for item in confirmed:
        if item.get("year"):
            by_year[int(item["year"])].append(item)

    selected: list[dict[str, Any]] = []
    for year in sorted(by_year, reverse=True):
        year_pairs = sorted(by_year[year], key=lambda item: item.get("exam_day") or "")
        days = {item.get("exam_day") for item in year_pairs}
        if {"1", "2"}.issubset(days) and len(selected) + len(year_pairs) <= MAX_PROCESSED_PAIRS:
            selected.extend(year_pairs)
        if len(selected) >= MAX_PROCESSED_PAIRS:
            break

    selected_keys = {item["file_name"] for item in selected}
    for item in inventory:
        item["processing_selected"] = item["file_name"] in selected_keys

    return [
        {
            "proof_file": item["file_name"],
            "answer_key_file": item.get("answer_key_file"),
            "year": item.get("year"),
            "exam_day": item.get("exam_day"),
            "application": item.get("application"),
            "booklet": item.get("booklet"),
            "question_count": item.get("question_count"),
        }
        for item in selected
    ]


def build_question_preview(
    inventory: list[dict[str, Any]],
    processed_pairs: list[dict[str, Any]],
    allow_unverified: bool,
) -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []
    selected_proofs = {item["proof_file"] for item in processed_pairs}
    proofs = [
        item
        for item in inventory
        if item["type"] == "prova"
        and not item["duplicate_of"]
        and (item["file_name"] in selected_proofs or allow_unverified)
    ]
    keys = {item["file_name"]: item for item in inventory if item["type"] == "gabarito"}

    for proof in proofs:
        if not proof.get("answer_key_file") and not allow_unverified:
            continue

        answer_map: dict[int, str] = {}
        answer_key_name = proof.get("answer_key_file")
        if answer_key_name and answer_key_name in keys:
            answer_map = parse_answer_key(Path(keys[answer_key_name]["file_path"]))

        extracted = extract_questions_from_proof(proof, answer_map)
        questions.extend(extracted)

    mark_duplicates(questions)
    apply_recurrence_and_priority(questions)
    return questions


def parse_answer_key(path: Path) -> dict[int, str]:
    pdf = read_pdf(path)
    return parse_answer_key_text(pdf.all_text)


def parse_answer_key_text(text: str) -> dict[int, str]:
    lines = [normalize_spaces(line) for line in text.splitlines()]
    answer_map: dict[int, str] = {}
    for index, line in enumerate(lines):
        if not re.fullmatch(r"\d{1,3}", line):
            continue
        number = int(line)
        if not 1 <= number <= 180:
            continue

        for candidate in lines[index + 1 : index + 4]:
            normalized_candidate = normalize(candidate)
            if re.fullmatch(r"[abcde]", normalized_candidate):
                answer_map.setdefault(number, normalized_candidate.upper())
                break
            if normalized_candidate in ("anulado", "anulada"):
                answer_map.setdefault(number, "Anulado")
                break
    return answer_map


def extract_questions_from_proof(proof: dict[str, Any], answer_map: dict[int, str]) -> list[dict[str, Any]]:
    pdf = read_pdf(Path(proof["file_path"]))
    combined_parts = []
    page_for_offset = []
    offset = 0
    for page_index, page_text in enumerate(pdf.pages, start=1):
        marker = f"\n[[PAGE {page_index}]]\n"
        combined_parts.append(marker)
        offset += len(marker)
        combined_parts.append(page_text)
        page_for_offset.append((offset, page_index))
        offset += len(page_text)

    combined = "".join(combined_parts)
    starts = list(re.finditer(r"(?i)quest(?:a|ã)o\s+0*(\d{1,3})\b", combined))
    questions = []
    for index, match in enumerate(starts):
        number = int(match.group(1))
        end = starts[index + 1].start() if index + 1 < len(starts) else len(combined)
        block = combined[match.start() : end]
        options = parse_options(block)
        statement = clean_statement(block, options)
        area = area_for_number(number)
        subject, topic, subtopic = classify_question(statement, area)
        page = page_number_for_offset(match.start(), page_for_offset)
        media_required = question_has_media(statement, pdf.image_counts, page)
        correct_option = answer_map.get(number)
        extraction_complete = bool(statement and all(options.get(key) for key in "ABCDE"))
        is_annulled = correct_option == "Anulado"
        review_status = "pending" if extraction_complete and correct_option and not is_annulled else "needs_review"
        editorial_notes = ["Classificacao automatica inicial; requer revisao editorial antes de importacao."]
        if number <= 5 and proof.get("exam_day") == "1":
            editorial_notes.append("Questao de lingua estrangeira; confirmar idioma antes de uso editorial.")
        if media_required:
            editorial_notes.append("Midia detectada; verificar exibicao e direitos antes de aprovacao.")
        if is_annulled:
            editorial_notes.append("Questao anulada no gabarito oficial.")
        question = {
            "year": proof.get("year"),
            "application": proof.get("application"),
            "exam_day": proof.get("exam_day"),
            "booklet": proof.get("booklet"),
            "question_number": number,
            "statement": statement,
            "option_a": options.get("A"),
            "option_b": options.get("B"),
            "option_c": options.get("C"),
            "option_d": options.get("D"),
            "option_e": options.get("E"),
            "correct_option": correct_option,
            "area": area,
            "subject": subject,
            "topic": topic,
            "subtopic": subtopic,
            "competence": None,
            "skill": None,
            "difficulty": estimate_difficulty(statement, media_required),
            "official_exam_url": proof.get("file_path"),
            "official_answer_key_url": proof.get("answer_key_file"),
            "source": f"ENEM {proof.get('year') or 'ano nao identificado'} - {proof.get('application') or 'aplicacao nao identificada'}",
            "source_url": proof.get("file_path"),
            "official_source": proof.get("file_name"),
            "is_official": True,
            "is_demo": False,
            "is_authorial": False,
            "is_inspired": False,
            "source_verified": bool(proof.get("source_verified")),
            "answer_verified": bool(correct_option),
            "media_required": media_required,
            "media_verified": False,
            "review_status": review_status,
            "reviewed": False,
            "reviewed_by": None,
            "reviewed_at": None,
            "historical_recurrence": "amostra insuficiente",
            "content_recurrence": "amostra insuficiente",
            "recurrence_confidence": "baixa",
            "charge_pattern": infer_charge_pattern(statement, media_required),
            "priority_level": "Complementar",
            "estimated_priority": "Complementar",
            "recurrence_category": "Complementar",
            "priority_score": 0,
            "priority_reason": None,
            "confidence_level": "baixa",
            "editorial_notes": " ".join(editorial_notes),
            "extraction_complete": extraction_complete,
            "is_annulled": is_annulled,
            "duplicate": False,
            "duplicate_reason": None,
            "page": page,
            "explanation": "Explicacao editorial pendente. Nao importar antes de revisao humana.",
        }
        question["extraction_has_noise"] = has_extraction_noise(question)
        if question["extraction_has_noise"]:
            question["extraction_complete"] = False
            question["review_status"] = "needs_review"
            question["editorial_notes"] += " Ruido estrutural do PDF detectado no texto extraido."
        questions.append(question)
    return questions


def parse_options(block: str) -> dict[str, str | None]:
    cleaned = re.sub(r"\[\[PAGE \d+\]\]", " ", block)
    matches = list(
        re.finditer(
            r"(?ms)^\s*([ABCDE])\s+(.*?)(?=^\s*[ABCDE]\s+|\Z)",
            cleaned,
        )
    )
    options: dict[str, str | None] = {key: None for key in "ABCDE"}
    for match in matches:
        key = match.group(1)
        text = clean_content_noise(match.group(2))
        if key in options and text:
            options[key] = text
    return options


def clean_statement(block: str, options: dict[str, str | None]) -> str:
    cleaned = re.sub(r"\[\[PAGE \d+\]\]", " ", block)
    cleaned = re.sub(r"(?i)^quest(?:a|ã)o\s+0*\d{1,3}\b", "", cleaned).strip()
    first_option = None
    for key in "ABCDE":
        option = options.get(key)
        if option:
            marker = re.search(rf"(?m)^\s*{key}\s+", cleaned)
            if marker:
                first_option = marker.start()
                break
    if first_option is not None:
        cleaned = cleaned[:first_option]
    return clean_content_noise(cleaned)


def clean_content_noise(value: Any) -> str:
    text = normalize_spaces(value)
    text = re.sub(r"\*\d{6}[A-Z]{2}\d+\*", " ", text)
    text = re.sub(r"(?:ENEM\s*[0-9E]{4}){2,}", " ", text, flags=re.I)
    text = re.sub(r"\bENEM\s*[0-9E]{4}\b", " ", text, flags=re.I)
    text = re.sub(r"(?:ENEM\s*20\d{2}){2,}", " ", text, flags=re.I)
    text = re.sub(r"(?:M?20\d{2}\s*ENEM\s*){2,}", " ", text, flags=re.I)
    text = re.sub(
        r"\b\d{1,2}\s+(?:MATEM[ÁA]TICA|CI[ÊE]NCIAS|LINGUAGENS).*?(?:AZUL|AMARELO|CINZA|ROSA|VERDE|BRANCO)\s*[•\-]?",
        " ",
        text,
        flags=re.I,
    )
    text = re.sub(r"\s+", " ", text).strip()
    return text


def has_extraction_noise(question: dict[str, Any]) -> bool:
    values = [
        question.get("statement"),
        question.get("option_a"),
        question.get("option_b"),
        question.get("option_c"),
        question.get("option_d"),
        question.get("option_e"),
    ]
    return any(
        re.search(r"ENEM\s*(?:20\d{2}|[0-9E]{4})|\*\d{6}[A-Z]{2}\d+\*", str(value), flags=re.I)
        for value in values
    )


def page_number_for_offset(offset: int, page_for_offset: list[tuple[int, int]]) -> int | None:
    current = None
    for start, page_number in page_for_offset:
        if offset >= start:
            current = page_number
        else:
            break
    return current


def area_for_number(number: int) -> str:
    for start, end, area in AREA_BY_RANGE:
        if start <= number <= end:
            return area
    return "Area nao identificada"


def classify_question(statement: str, area: str) -> tuple[str, str, str]:
    normalized = normalize(statement)
    for target_area, pattern, topic, subtopic in TOPIC_RULES:
        if target_area == area and re.search(pattern, normalized):
            if area == "Matematica":
                return "Matematica", topic, subtopic
            if area == "Linguagens":
                return "Linguagens", topic, subtopic
            if area == "Ciencias da Natureza":
                if topic in ("Ecologia", "Genetica"):
                    return "Biologia", topic, subtopic
                if topic == "Fisica":
                    return "Fisica", subtopic, "Sugestao automatica"
                if topic == "Quimica":
                    return "Quimica", subtopic, "Sugestao automatica"
            if area == "Ciencias Humanas":
                return topic, subtopic, "Sugestao automatica"

    defaults = {
        "Matematica": ("Matematica", "Assunto a revisar", "Subtopico a revisar"),
        "Ciencias da Natureza": ("Ciencias da Natureza", "Assunto a revisar", "Subtopico a revisar"),
        "Ciencias Humanas": ("Ciencias Humanas", "Assunto a revisar", "Subtopico a revisar"),
        "Linguagens": ("Linguagens", "Assunto a revisar", "Subtopico a revisar"),
    }
    return defaults.get(area, ("Disciplina a revisar", "Assunto a revisar", "Subtopico a revisar"))


def question_has_media(statement: str, image_counts: list[int], page: int | None) -> bool:
    normalized = normalize(statement)
    media_words = "figura|grafico|tabela|mapa|tirinha|charge|cartum|imagem|pintura|fotografia|infografico|anuncio"
    return bool(re.search(media_words, normalized))


def estimate_difficulty(statement: str, media_required: bool) -> str:
    length = len(statement)
    if length > 1600 or media_required:
        return "Alta"
    if length > 800:
        return "Media"
    return "Baixa"


def infer_charge_pattern(statement: str, media_required: bool) -> str:
    normalized = normalize(statement)
    if re.search(r"grafico|tabela|mapa|infografico", normalized):
        return "interpretacao de dados em suporte visual"
    if media_required:
        return "leitura de suporte visual"
    if re.search(r"calcule|qual e|probabilidade|porcent", normalized):
        return "resolucao contextualizada"
    return "interpretacao contextualizada"


def mark_duplicates(questions: list[dict[str, Any]]) -> None:
    seen_keys: dict[str, int] = {}
    seen_hashes: dict[str, int] = {}
    for index, question in enumerate(questions):
        source_key = "|".join(
            str(question.get(part) or "")
            for part in ("year", "application", "exam_day", "booklet", "question_number")
        )
        text_hash = hashlib.sha256(normalize(question.get("statement") or "").encode("utf-8")).hexdigest()
        if source_key in seen_keys:
            question["duplicate"] = True
            question["duplicate_reason"] = "Mesmo ano/aplicacao/dia/caderno/numero."
        elif text_hash in seen_hashes:
            question["duplicate"] = True
            question["duplicate_reason"] = "Hash normalizado do enunciado repetido."
        seen_keys[source_key] = index
        seen_hashes[text_hash] = index


def apply_recurrence_and_priority(questions: list[dict[str, Any]]) -> None:
    grouped: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for question in questions:
        grouped[(question["area"], question["subject"], question["topic"])].append(question)

    for (_area, _subject, _topic), items in grouped.items():
        years = {item.get("year") for item in items if item.get("year")}
        count = len(items)
        if count >= 4 and len(years) >= 3:
            recurrence = "conteudo frequente em anos diferentes"
            recurrence_confidence = "alta"
        elif count >= 2 and len(years) >= 2:
            recurrence = "conteudo presente na amostra de dois anos; nao conclusivo"
            recurrence_confidence = "moderada"
        elif count >= 2:
            recurrence = "padrao repetido na mesma amostra"
            recurrence_confidence = "baixa"
        else:
            recurrence = "amostra insuficiente"
            recurrence_confidence = "baixa"

        for item in items:
            item["historical_recurrence"] = recurrence
            item["content_recurrence"] = recurrence
            item["recurrence_confidence"] = recurrence_confidence
            item["priority_score"] = score_question(item, count, len(years))
            item["priority_level"] = priority_level(item["priority_score"], len(years))
            item["estimated_priority"] = item["priority_level"]
            item["recurrence_category"] = item["priority_level"]
            item["priority_reason"] = (
                f"Sugestao automatica baseada em {count} ocorrencia(s) no lote processado "
                f"e {len(years)} ano(s) analisado(s); requer revisao editorial."
            )


def score_question(question: dict[str, Any], topic_count: int, year_count: int) -> int:
    score = 0
    score += min(PRIORITY_WEIGHTS["historical_recurrence_weight"], topic_count * 5)
    score += min(PRIORITY_WEIGHTS["years_diversity_weight"], year_count * 5)
    score += PRIORITY_WEIGHTS["extraction_quality_weight"] if question.get("extraction_complete") else 0
    score += PRIORITY_WEIGHTS["editorial_confidence_weight"] if question.get("confidence_level") == "alta" else 0
    if question.get("media_required"):
        score += 2
    return min(score, 100)


def priority_level(score: int, year_count: int) -> str:
    if year_count < 3 and score >= 45:
        return "Prioridade media"
    if score >= 80:
        return "Potencial muito alto de recorrencia do conteudo"
    if score >= 65:
        return "Alta prioridade"
    if score >= 45:
        return "Prioridade media"
    return "Complementar"


def build_recurrence_table(questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not questions:
        return []
    groups: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for question in questions:
        groups[
            (
                question.get("area") or "",
                question.get("subject") or "",
                question.get("topic") or "",
                question.get("subtopic") or "",
            )
        ].append(question)

    rows = []
    for (area, subject, topic, subtopic), items in sorted(groups.items()):
        years = sorted({item.get("year") for item in items if item.get("year")})
        patterns = sorted({item.get("charge_pattern") for item in items if item.get("charge_pattern")})
        difficulties = Counter(item.get("difficulty") for item in items if item.get("difficulty"))
        recurrence = items[0].get("historical_recurrence") or "amostra insuficiente"
        rows.append(
            {
                "area": area,
                "discipline": subject,
                "topic": topic,
                "subtopic": subtopic,
                "occurrences": len(items),
                "years": years,
                "analyzed_questions": len(items),
                "related_skills": sorted({item.get("skill") for item in items if item.get("skill")}),
                "charging_patterns": patterns,
                "predominant_difficulty": difficulties.most_common(1)[0][0] if difficulties else None,
                "recurrence": recurrence,
                "confidence_level": items[0].get("recurrence_confidence") or "baixa",
                "justification": (
                    f"Gerado por agrupamento automatico em amostra de {len(items)} questao(oes) "
                    f"e {len(years)} ano(s); requer revisao editorial."
                ),
            }
        )
    return rows


def select_pilot_questions(questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for area, quota in PILOT_QUOTAS.items():
        candidates = [
            q
            for q in questions
            if q.get("area") == area
            and q.get("review_status") == "pending"
            and q.get("source_verified")
            and q.get("answer_verified")
            and not q.get("duplicate")
            and not q.get("is_annulled")
            and q.get("extraction_complete")
            and q.get("correct_option") in list("ABCDE")
            and not (q.get("exam_day") == "1" and q.get("question_number", 0) <= 5)
        ]
        candidates.sort(key=lambda item: (item.get("priority_score") or 0, item.get("year") or 0), reverse=True)
        topic_counts: Counter[str] = Counter()
        area_selected: list[dict[str, Any]] = []
        for candidate in candidates:
            topic = candidate.get("topic") or "Sem assunto"
            if topic_counts[topic] >= 3:
                continue
            area_selected.append(candidate)
            topic_counts[topic] += 1
            if len(area_selected) == quota:
                break
        if len(area_selected) < quota:
            selected_ids = {id(item) for item in area_selected}
            for candidate in candidates:
                if id(candidate) in selected_ids:
                    continue
                area_selected.append(candidate)
                if len(area_selected) == quota:
                    break
        selected.extend(area_selected)
    return selected


def build_import_payloads(selected: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    payloads = {area: [] for area in IMPORT_FILENAMES}
    for question in selected:
        area = question.get("area")
        if area not in payloads:
            continue
        if not is_importable(question):
            continue
        payloads[area].append(to_import_row(question))
    return payloads


def is_importable(question: dict[str, Any]) -> bool:
    return bool(
        question.get("source_verified")
        and question.get("answer_verified")
        and question.get("review_status") == "approved"
        and question.get("reviewed")
        and question.get("correct_option") in list("ABCDE")
    )


def to_import_row(question: dict[str, Any]) -> dict[str, Any]:
    return {
        key: question.get(key)
        for key in [
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
            "classification_version",
            "recurrence_category",
        ]
        if key in question
    }


def build_preview_report(
    inventory: list[dict[str, Any]],
    matches: list[dict[str, Any]],
    processed_pairs: list[dict[str, Any]],
    questions: list[dict[str, Any]],
    recurrence_table: list[dict[str, Any]],
    selected: list[dict[str, Any]],
) -> dict[str, Any]:
    unique_proofs = [item for item in inventory if item["type"] == "prova" and not item["duplicate_of"]]
    raw_proofs = [item for item in inventory if item["type"] == "prova"]
    duplicates = [item for item in inventory if item.get("duplicate_of")]
    ignored = [item for item in inventory if item["type"] == "ignored"]
    answer_keys = [item for item in inventory if item["type"] == "gabarito"]
    unique_answer_keys = [item for item in answer_keys if not item.get("duplicate_of")]
    confirmed_matches = [item for item in matches if item.get("answer_key_file")]
    unmatched_proofs = [item["file_name"] for item in unique_proofs if not item.get("answer_key_file")]
    unmatched_answer_keys = [
        item["file_name"]
        for item in unique_answer_keys
        if not item.get("matched_proof_file")
    ]
    unique_question_markers = sum(item.get("question_count") or 0 for item in unique_proofs)
    raw_question_markers = sum(item.get("question_count") or 0 for item in raw_proofs)
    duplicate_question_markers = sum(item.get("question_count") or 0 for item in duplicates)
    approved = [q for q in questions if q.get("review_status") == "approved"]
    pending = [q for q in questions if q.get("review_status") == "pending"]
    needs_review = [q for q in questions if q.get("review_status") == "needs_review"]
    media = [q for q in questions if q.get("media_required")]
    annulled = [q for q in questions if q.get("is_annulled")]
    failures = [q for q in questions if not q.get("extraction_complete")]
    discarded = [q for q in questions if q.get("duplicate")]

    blockers = []
    if len(selected) < sum(PILOT_QUOTAS.values()):
        blockers.append(
            f"Lote piloto incompleto: {len(selected)} de {sum(PILOT_QUOTAS.values())} questoes selecionadas."
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "files": {
            "attached_files": len(inventory),
            "proof_files": len(raw_proofs),
            "unique_proof_files": len(unique_proofs),
            "answer_key_files": len(answer_keys),
            "unique_answer_key_files": len(unique_answer_keys),
            "confirmed_pairs": len(confirmed_matches),
            "processed_pairs": len(processed_pairs),
            "unmatched_proofs": unmatched_proofs,
            "unmatched_answer_keys": unmatched_answer_keys,
            "ignored_files": [item["file_name"] for item in ignored],
            "duplicate_files": len(duplicates),
            "duplicate_file_names": [item["file_name"] for item in duplicates],
        },
        "questions": {
            "found_raw_by_markers": raw_question_markers,
            "found_unique_by_markers": unique_question_markers,
            "extracted": len(questions),
            "valid": len([q for q in questions if q.get("extraction_complete")]),
            "approved": len(approved),
            "pending": len(pending),
            "needs_review": len(needs_review),
            "discarded": len(discarded) + duplicate_question_markers,
            "failures": len(failures),
            "annulled_verified": len(annulled),
            "annulled_questions": [
                f"{q.get('year')} {q.get('application')} D{q.get('exam_day')} Q{q.get('question_number')}"
                for q in annulled
            ],
            "with_media": len(media) if questions else "not_evaluated",
            "editorial_doubt": len(needs_review) if questions else unique_question_markers,
            "duplicated": len(discarded) + duplicate_question_markers,
        },
        "by_area": count_markers_by_area(unique_proofs, questions),
        "by_year": count_by_year(unique_proofs, questions),
        "by_priority": Counter(q.get("recurrence_category") for q in questions if q.get("recurrence_category")),
        "recurrence_rows": len(recurrence_table),
        "selected_pilot_questions": len(selected),
        "selected_by_area": dict(Counter(q.get("area") for q in selected)),
        "processed_pairs": processed_pairs,
        "blockers": blockers,
        "import_files": {
            area: str(DEFAULT_IMPORTS_DIR / filename)
            for area, filename in IMPORT_FILENAMES.items()
        },
        "commands": {
            "setup": "python -m venv work\\pdf-venv; .\\work\\pdf-venv\\Scripts\\python.exe -m pip install -r scripts\\requirements-enem-pipeline.txt",
            "preview": ".\\work\\pdf-venv\\Scripts\\python.exe scripts\\enem-pilot-pipeline.py",
            "import_preview_matematica": "node scripts/import-questions.mjs --file supabase/imports/enem-piloto-matematica.json",
            "import_preview_natureza": "node scripts/import-questions.mjs --file supabase/imports/enem-piloto-natureza.json",
            "import_preview_humanas": "node scripts/import-questions.mjs --file supabase/imports/enem-piloto-humanas.json",
            "import_preview_linguagens": "node scripts/import-questions.mjs --file supabase/imports/enem-piloto-linguagens.json",
            "commit_example": "node scripts/import-questions.mjs --file supabase/imports/enem-piloto-matematica.json --commit",
        },
    }


def count_markers_by_area(unique_proofs: list[dict[str, Any]], questions: list[dict[str, Any]]) -> dict[str, int]:
    if questions:
        return dict(Counter(q.get("area") for q in questions if q.get("area")))
    counts = Counter()
    for item in unique_proofs:
        numbers = item.get("question_numbers") or []
        for number in numbers:
            counts[area_for_number(number)] += 1
    return dict(counts)


def count_by_year(unique_proofs: list[dict[str, Any]], questions: list[dict[str, Any]]) -> dict[str, int]:
    if questions:
        return dict(Counter(str(q.get("year") or "ano_nao_identificado") for q in questions))
    counts = Counter()
    for item in unique_proofs:
        key = str(item.get("year") or "ano_nao_identificado")
        counts[key] += item.get("question_count") or 0
    return dict(counts)


def build_priority_policy() -> dict[str, Any]:
    return {
        "warning": "Pontuacao educativa para triagem editorial, nao previsao cientifica.",
        "weights": PRIORITY_WEIGHTS,
        "categories": [
            "Potencial muito alto de recorrencia do conteudo",
            "Alta prioridade",
            "Prioridade media",
            "Complementar",
        ],
        "allowed_language": [
            "conteudo de alta recorrencia",
            "padrao de cobranca frequente",
            "questao representativa de um conteudo recorrente",
            "alta prioridade de revisao",
            "estimativa baseada no historico analisado",
        ],
        "forbidden_language": FORBIDDEN_PRIORITY_LANGUAGE,
    }


def render_inventory_md(inventory: list[dict[str, Any]]) -> str:
    lines = [
        "# Inventario dos anexos ENEM",
        "",
        "Regra: prova sem gabarito correspondente nao segue para importacao.",
        "",
        "| arquivo | tipo | ano | aplicacao | dia | caderno | questoes | gabarito | paginas | problemas | confianca |",
        "| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- |",
    ]
    for item in inventory:
        lines.append(
            "| {file} | {type} | {year} | {app} | {day} | {booklet} | {count} | {key} | {pages} | {problems} | {confidence} |".format(
                file=item["file_name"],
                type=item["type"],
                year=item.get("year") or "nao identificado",
                app=item.get("application") or "nao identificado",
                day=item.get("exam_day") or "nao identificado",
                booklet=item.get("booklet") or "nao identificado",
                count=item.get("question_count") or 0,
                key=item.get("answer_key_file") or "nao identificado",
                pages=format_ranges(item.get("relevant_pages") or []),
                problems="<br>".join(item.get("problems") or []) or "-",
                confidence=item.get("identification_confidence") or "baixa",
            )
        )
    return "\n".join(lines) + "\n"


def render_matches_md(matches: list[dict[str, Any]]) -> str:
    lines = [
        "# Correspondencia prova-gabarito",
        "",
        "| prova | gabarito | ano | dia | aplicacao | caderno | confianca | processado | observacoes |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for item in matches:
        lines.append(
            "| {proof} | {answer} | {year} | {day} | {application} | {booklet} | {confidence} | {processed} | {observations} |".format(
                proof=item.get("proof_file") or "-",
                answer=item.get("answer_key_file") or "unmatched",
                year=item.get("year") or "nao identificado",
                day=item.get("exam_day") or "nao identificado",
                application=item.get("application") or "nao identificado",
                booklet=item.get("booklet") or "nao identificado",
                confidence=item.get("association_confidence") or "unmatched",
                processed="sim" if item.get("processed") else "nao",
                observations=item.get("observations") or "-",
            )
        )
    return "\n".join(lines) + "\n"


def render_preview_md(report: dict[str, Any], recurrence_table: list[dict[str, Any]], selected: list[dict[str, Any]]) -> str:
    lines = [
        "# Preview do lote piloto ENEM",
        "",
        "As indicacoes de recorrencia sao estimativas baseadas no historico e nos padroes de cobranca analisados. Nao representam previsao exata do conteudo da prova.",
        "",
        "## Resumo",
        "",
        f"- Arquivos anexados: {report['files']['attached_files']}",
        f"- Provas unicas identificadas: {report['files']['unique_proof_files']}",
        f"- Gabaritos identificados: {report['files']['answer_key_files']}",
        f"- Pares confirmados: {report['files']['confirmed_pairs']}",
        f"- Pares processados neste lote: {report['files']['processed_pairs']}",
        f"- Questoes encontradas por marcadores em provas unicas: {report['questions']['found_unique_by_markers']}",
        f"- Questoes extraidas: {report['questions']['extracted']}",
        f"- Questoes validas: {report['questions']['valid']}",
        f"- Questoes aprovadas: {report['questions']['approved']}",
        f"- Questoes pendentes: {report['questions']['pending']}",
        f"- Questoes com falha de extracao: {report['questions']['failures']}",
        f"- Questoes em revisao/duvida editorial: {report['questions']['editorial_doubt']}",
        f"- Questoes descartadas/duplicadas: {report['questions']['discarded']}",
        f"- Questoes anuladas verificadas: {report['questions']['annulled_verified']}",
        f"- Questoes com midia: {report['questions']['with_media']}",
        "",
        "## Bloqueios",
        "",
    ]
    lines.extend([f"- {blocker}" for blocker in report["blockers"]] or ["- Nenhum bloqueio."])
    lines.extend(
        [
            "",
            "## Por area",
            "",
        ]
    )
    for area, count in report["by_area"].items():
        lines.append(f"- {area}: {count}")
    lines.extend(["", "## Pares processados", ""])
    for pair in report["processed_pairs"]:
        lines.append(
            f"- {pair['year']} D{pair['exam_day']} {pair['application']} {pair['booklet']}: "
            f"{pair['proof_file']} + {pair['answer_key_file']}"
        )
    lines.extend(["", "## Provas sem gabarito", ""])
    lines.extend([f"- {name}" for name in report["files"]["unmatched_proofs"]] or ["- Nenhuma."])
    lines.extend(["", "## Gabaritos sem prova", ""])
    lines.extend([f"- {name}" for name in report["files"]["unmatched_answer_keys"]] or ["- Nenhum."])
    lines.extend(["", "## Arquivos ignorados", ""])
    lines.extend([f"- {name}" for name in report["files"]["ignored_files"]] or ["- Nenhum."])
    lines.extend(["", "## Por ano", ""])
    for year, count in report["by_year"].items():
        lines.append(f"- {year}: {count}")
    lines.extend(
        [
            "",
            "## Tabela de recorrencia",
            "",
            f"Linhas geradas: {len(recurrence_table)}",
        ]
    )
    if not recurrence_table:
        lines.append("A tabela nao foi calculada porque nao houve questoes extraidas.")
    lines.extend(
        [
            "",
            "## Lote piloto selecionado",
            "",
            f"Questoes selecionadas: {len(selected)}",
        ]
    )
    if not selected:
        lines.append("Nenhuma questao foi selecionada, pois nao ha gabarito verificavel entre os anexos.")
    else:
        for area, count in report["selected_by_area"].items():
            lines.append(f"- {area}: {count}")
        lines.append("")
        for question in selected:
            lines.append(
                f"- {question['area']} | {question['year']} D{question['exam_day']} Q{question['question_number']} "
                f"| {question['topic']} | gabarito {question['correct_option']} | {question['review_status']}"
            )
    lines.extend(
        [
            "",
            "## Pesos de prioridade",
            "",
        ]
    )
    for key, value in PRIORITY_WEIGHTS.items():
        lines.append(f"- {key}: {value}")
    lines.extend(
        [
            "",
            "## Comandos",
            "",
            f"- Setup: `{report['commands']['setup']}`",
            f"- Preview: `{report['commands']['preview']}`",
            f"- Import preview Matematica: `{report['commands']['import_preview_matematica']}`",
            f"- Import preview Natureza: `{report['commands']['import_preview_natureza']}`",
            f"- Import preview Humanas: `{report['commands']['import_preview_humanas']}`",
            f"- Import preview Linguagens: `{report['commands']['import_preview_linguagens']}`",
        ]
    )
    return "\n".join(lines) + "\n"


def render_future_plan_md() -> str:
    return """# Plano para ampliar ate 300 questoes

1. Anexar pares completos de prova e gabarito oficial por ano, aplicacao, dia e caderno.
2. Rodar o inventario e corrigir qualquer prova sem correspondencia unica de gabarito.
3. Extrair apenas provas com fonte e gabarito verificados.
4. Revisar manualmente enunciado, alternativas, resposta, midia, assunto, habilidade e justificativa.
5. Aprovar somente itens com review_status=approved, reviewed=true, source_verified=true e answer_verified=true.
6. Regerar os arquivos de importacao por area.
7. Importar em lotes pequenos ate atingir 100 Matematica, 80 Natureza, 60 Humanas e 60 Linguagens.

Nao importar as 300 questoes de uma vez. Cada ampliacao deve preservar a auditoria de fonte, gabarito, duplicidade e revisao editorial.
"""


def safe_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in metadata.items() if value not in (None, "")}


def format_ranges(values: list[int]) -> str:
    if not values:
        return "-"
    ranges = []
    start = previous = values[0]
    for value in values[1:]:
        if value == previous + 1:
            previous = value
            continue
        ranges.append(f"{start}" if start == previous else f"{start}-{previous}")
        start = previous = value
    ranges.append(f"{start}" if start == previous else f"{start}-{previous}")
    return ", ".join(ranges)


def normalize(value: Any) -> str:
    text = str(value)
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return normalize_spaces(text).lower()


def normalize_spaces(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value)).strip()


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
