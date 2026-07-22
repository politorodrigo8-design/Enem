#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const defaultImportFiles = [
  "supabase/imports/enem-piloto-matematica.json",
  "supabase/imports/enem-piloto-natureza.json",
  "supabase/imports/enem-piloto-humanas.json",
  "supabase/imports/enem-piloto-linguagens.json",
  "supabase/imports/batches/enem-piloto-matematica-001-040-pending.json",
];

const cp1252Bytes = new Map([
  ["€", 0x80],
  ["‚", 0x82],
  ["ƒ", 0x83],
  ["„", 0x84],
  ["…", 0x85],
  ["†", 0x86],
  ["‡", 0x87],
  ["ˆ", 0x88],
  ["‰", 0x89],
  ["Š", 0x8a],
  ["‹", 0x8b],
  ["Œ", 0x8c],
  ["Ž", 0x8e],
  ["‘", 0x91],
  ["’", 0x92],
  ["“", 0x93],
  ["”", 0x94],
  ["•", 0x95],
  ["–", 0x96],
  ["—", 0x97],
  ["˜", 0x98],
  ["™", 0x99],
  ["š", 0x9a],
  ["›", 0x9b],
  ["œ", 0x9c],
  ["ž", 0x9e],
  ["Ÿ", 0x9f],
]);

const mojibakePatterns = [
  /Ã[\u0080-\u00bf]/u,
  /Â[\u0080-\u00bf]?/u,
  /â[€\u0080][\u0080-\u00bfœ€œ€˜€™“”–—¦¦]/u,
  /â[\u0080-\u00bf]/u,
  /�/u,
  /[\u0080-\u009f]/u,
];

const urlLikeFields = new Set([
  "source_url",
  "official_exam_url",
  "official_answer_key_url",
  "media_url",
  "source_pdf",
  "official_source",
]);

export const canonicalAreas = {
  matematica: "Matemática",
  "ciencias da natureza": "Ciências da Natureza",
  "ciências da natureza": "Ciências da Natureza",
  "ciencias humanas": "Ciências Humanas",
  "ciências humanas": "Ciências Humanas",
  linguagens: "Linguagens",
};

export const canonicalSubjects = {
  matematica: "Matemática",
  biologia: "Biologia",
  fisica: "Física",
  física: "Física",
  quimica: "Química",
  química: "Química",
  historia: "História",
  história: "História",
  geografia: "Geografia",
  filosofia: "Filosofia",
  sociologia: "Sociologia",
  linguagens: "Linguagens",
  "lingua portuguesa": "Língua Portuguesa",
  "língua portuguesa": "Língua Portuguesa",
  literatura: "Literatura",
  ingles: "Inglês",
  inglês: "Inglês",
  espanhol: "Espanhol",
  artes: "Artes",
  "educacao fisica": "Educação Física",
  "educação física": "Educação Física",
  tecnologias: "Tecnologias",
  redacao: "Redação",
  redação: "Redação",
};

export const canonicalTopics = {
  "numeros e operacoes": "Números e operações",
  "números e operações": "Números e operações",
  "razao, proporcao e porcentagem": "Razão, proporção e porcentagem",
  "razão, proporção e porcentagem": "Razão, proporção e porcentagem",
  "escalas e unidades de medida": "Escalas e unidades de medida",
  "matematica financeira": "Matemática financeira",
  "matemática financeira": "Matemática financeira",
  estatistica: "Estatística",
  estatística: "Estatística",
  probabilidade: "Probabilidade",
  "analise combinatoria": "Análise combinatória",
  "análise combinatória": "Análise combinatória",
  "interpretacao de graficos e tabelas": "Interpretação de gráficos e tabelas",
  "interpretação de gráficos e tabelas": "Interpretação de gráficos e tabelas",
  funcoes: "Funções",
  funções: "Funções",
  "equacoes e inequacoes": "Equações e inequações",
  "equações e inequações": "Equações e inequações",
  "sequencias e progressoes": "Sequências e progressões",
  "sequências e progressões": "Sequências e progressões",
  "geometria plana": "Geometria plana",
  "geometria espacial": "Geometria espacial",
  "geometria analitica": "Geometria analítica",
  "geometria analítica": "Geometria analítica",
  trigonometria: "Trigonometria",
  "ecologia e meio ambiente": "Ecologia e meio ambiente",
  "genetica e evolucao": "Genética e evolução",
  "genética e evolução": "Genética e evolução",
  "citologia e bioquimica": "Citologia e bioquímica",
  "citologia e bioquímica": "Citologia e bioquímica",
  "fisiologia humana": "Fisiologia humana",
  "imunologia e saude": "Imunologia e saúde",
  "imunologia e saúde": "Imunologia e saúde",
  "botanica e zoologia": "Botânica e zoologia",
  "botânica e zoologia": "Botânica e zoologia",
  biotecnologia: "Biotecnologia",
  mecanica: "Mecânica",
  mecânica: "Mecânica",
  "energia e trabalho": "Energia e trabalho",
  "eletricidade e magnetismo": "Eletricidade e magnetismo",
  "ondas e acustica": "Ondas e acústica",
  "ondas e acústica": "Ondas e acústica",
  optica: "Óptica",
  óptica: "Óptica",
  "termologia e termodinamica": "Termologia e termodinâmica",
  "termologia e termodinâmica": "Termologia e termodinâmica",
  hidrostatica: "Hidrostática",
  hidrostática: "Hidrostática",
  "fisica moderna": "Física moderna",
  "física moderna": "Física moderna",
  estequiometria: "Estequiometria",
  "solucoes e concentracao": "Soluções e concentração",
  "soluções e concentração": "Soluções e concentração",
  "funcoes inorganicas": "Funções inorgânicas",
  "funções inorgânicas": "Funções inorgânicas",
  "quimica organica": "Química orgânica",
  "química orgânica": "Química orgânica",
  eletroquimica: "Eletroquímica",
  eletroquímica: "Eletroquímica",
  termoquimica: "Termoquímica",
  termoquímica: "Termoquímica",
  "cinetica e equilibrio quimico": "Cinética e equilíbrio químico",
  "cinética e equilíbrio químico": "Cinética e equilíbrio químico",
  "atomistica e tabela periodica": "Atomística e tabela periódica",
  "atomística e tabela periódica": "Atomística e tabela periódica",
  "separacao de misturas e propriedades": "Separação de misturas e propriedades",
  "separação de misturas e propriedades": "Separação de misturas e propriedades",
  "quimica ambiental": "Química ambiental",
  "química ambiental": "Química ambiental",
  radioatividade: "Radioatividade",
  "brasil colonia": "Brasil Colônia",
  "brasil colônia": "Brasil Colônia",
  "brasil imperio": "Brasil Império",
  "brasil império": "Brasil Império",
  "republica velha": "República Velha",
  "república velha": "República Velha",
  "era vargas": "Era Vargas",
  "ditadura militar e redemocratizacao": "Ditadura militar e redemocratização",
  "ditadura militar e redemocratização": "Ditadura militar e redemocratização",
  "idade antiga e media": "Idade Antiga e Média",
  "idade antiga e média": "Idade Antiga e Média",
  "idade moderna": "Idade Moderna",
  "idade contemporanea": "Idade Contemporânea",
  "idade contemporânea": "Idade Contemporânea",
  "historia da america": "História da América",
  "história da américa": "História da América",
  "escravidao e cultura afro-brasileira": "Escravidão e cultura afro-brasileira",
  "escravidão e cultura afro-brasileira": "Escravidão e cultura afro-brasileira",
  "povos indigenas": "Povos indígenas",
  "povos indígenas": "Povos indígenas",
  urbanizacao: "Urbanização",
  urbanização: "Urbanização",
  "globalizacao e geopolitica": "Globalização e geopolítica",
  "globalização e geopolítica": "Globalização e geopolítica",
  "meio ambiente e sustentabilidade": "Meio ambiente e sustentabilidade",
  "populacao e migracoes": "População e migrações",
  "população e migrações": "População e migrações",
  "agricultura e agropecuaria": "Agricultura e agropecuária",
  "agricultura e agropecuária": "Agricultura e agropecuária",
  "industria e energia": "Indústria e energia",
  "indústria e energia": "Indústria e energia",
  cartografia: "Cartografia",
  "clima e relevo": "Clima e relevo",
  hidrografia: "Hidrografia",
  "filosofia antiga": "Filosofia antiga",
  "filosofia moderna e contemporanea": "Filosofia moderna e contemporânea",
  "filosofia moderna e contemporânea": "Filosofia moderna e contemporânea",
  "etica e moral": "Ética e moral",
  "ética e moral": "Ética e moral",
  "politica e estado": "Política e Estado",
  "política e estado": "Política e Estado",
  "teoria do conhecimento": "Teoria do conhecimento",
  "cidadania e direitos": "Cidadania e direitos",
  "trabalho e sociedade": "Trabalho e sociedade",
  "cultura e identidade": "Cultura e identidade",
  "movimentos sociais": "Movimentos sociais",
  "desigualdade social": "Desigualdade social",
  "midia e sociedade": "Mídia e sociedade",
  "mídia e sociedade": "Mídia e sociedade",
  "interpretacao textual": "Interpretação textual",
  "interpretação textual": "Interpretação textual",
  "generos textuais": "Gêneros textuais",
  "gêneros textuais": "Gêneros textuais",
  "funcoes da linguagem": "Funções da linguagem",
  "funções da linguagem": "Funções da linguagem",
  "variacao linguistica": "Variação linguística",
  "variação linguística": "Variação linguística",
  "norma e gramatica contextualizada": "Norma e gramática contextualizada",
  "norma e gramática contextualizada": "Norma e gramática contextualizada",
  "coesao e coerencia": "Coesão e coerência",
  "coesão e coerência": "Coesão e coerência",
  "publicidade e midia": "Publicidade e mídia",
  "publicidade e mídia": "Publicidade e mídia",
  "linguagem verbal e nao verbal": "Linguagem verbal e não verbal",
  "linguagem verbal e não verbal": "Linguagem verbal e não verbal",
  "escolas literarias": "Escolas literárias",
  "escolas literárias": "Escolas literárias",
  poesia: "Poesia",
  prosa: "Prosa",
  "literatura contemporanea e marginal": "Literatura contemporânea e marginal",
  "literatura contemporânea e marginal": "Literatura contemporânea e marginal",
  "interpretacao de texto em ingles": "Interpretação de texto em inglês",
  "interpretação de texto em inglês": "Interpretação de texto em inglês",
  "interpretacao de texto em espanhol": "Interpretação de texto em espanhol",
  "interpretação de texto em espanhol": "Interpretação de texto em espanhol",
  "artes visuais e musica": "Artes visuais e música",
  "artes visuais e música": "Artes visuais e música",
  "corpo, saude e praticas corporais": "Corpo, saúde e práticas corporais",
  "corpo, saúde e práticas corporais": "Corpo, saúde e práticas corporais",
  "tecnologias da informacao e comunicacao": "Tecnologias da informação e comunicação",
  "tecnologias da informação e comunicação": "Tecnologias da informação e comunicação",
};

export function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function canonicalizeQuestionTaxonomy(row) {
  const result = { ...row };
  result.area = canonicalAreas[normalizeKey(result.area)] ?? result.area;
  result.subject = canonicalSubjects[normalizeKey(result.subject)] ?? result.subject;
  result.topic = canonicalTopics[normalizeKey(result.topic)] ?? result.topic;
  if (result.discipline) {
    result.discipline = canonicalSubjects[normalizeKey(result.discipline)] ?? result.discipline;
  }
  return result;
}

// Campos de conteudo visivel ao aluno — unicos onde faz sentido remover rodape de prova.
const contentTextFields = new Set([
  "statement",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "explanation",
]);

// Marcadores de rodape/cabecalho dos cadernos oficiais que vazam na extracao do PDF
// (ex.: "CH - 1º dia | Caderno 1 - AZUL - Página 28", "ENEN2025", "RASCUNHO DA REDAÇÃO").
export const examFooterMarkers = [
  /RASCUNHO DA REDA[ÇC][ÃA]O/i,
  /ENEN?\s?2025/,
  /\benemo\s?0?\d/i,
  /[•\-–|]?\s*(CI[EÊ]NCIAS (HUMANAS|DA NATUREZA)|LINGUAGENS,? C[ÓO]DIGOS|MATEM[ÁA]TICA E SUAS)[^.]*?(TECNOLOGIAS|DIA|CADERNO)/i,
  /\b(CH|CN|LC|MT)\s*[-–•]\s*(\d|[ºo°]|dia|DIA)/i,
  /\b\d\s*[-–]\s*AZUL\s*[-–]\s*(P[áa]gina|\d+\s*[ªaº°o]\s*Aplica)/i,
  /\|\s*Caderno\s*\d/i,
  /\bCADERNO\s*\d\s*[-–|•]?\s*AZUL/i,
  /[ºo°]\s*DIA\s*[•|]\s*CADERNO/i,
  /[-–]\s*AZUL\s*[-–]\s*P[áa]gina/i,
  /Exame Nacional do Ensino/i,
  /\bANO do Ensino M[ée]dio/i,
  /-\s*\d+[ªa]\s*Aplica[çc][ãa]o/i,
];

const footerKeywords =
  /CADERNO|AZUL|DIA|dia|ENEN|RASCUNHO|Caderno|P[áa]gina|enemo|TECNOLOGIAS|Aplica[çc]|Ensino M[ée]dio|\b(CH|CN|LC|MT)\b|\d|[\s•·\-–|.,:;ºo°ªa]/g;

function earliestFooterIndex(value) {
  let best = -1;
  for (const pattern of examFooterMarkers) {
    const match = value.match(pattern);
    if (match && (best < 0 || match.index < best)) best = match.index;
  }
  return best;
}

function trimFooterResidue(head) {
  return head
    .replace(/\s*\d{1,3}\s*[–\-]\s*(CH|CN|LC|MT)\s*[•·]?\s*\d*\s*[ºo°]?\s*$/i, "")
    .replace(/\s*[–\-]\s*(CH|CN|LC|MT)\s*[•·]?\s*\d*\s*[ºo°]?\s*$/i, "")
    .replace(/([.!?"”'’)])\s*\d{1,3}\s*$/, "$1")
    .replace(/\s*\|\s*\d{1,3}\s*$/, "")
    .replace(/[\s•\-–|]+$/, "");
}

// O resto da string a partir do marcador e so rodape (numeros de pagina, nomes de
// caderno, siglas), ou tem conteudo real? Conta letras que sobram fora dos tokens.
function isFooterOnly(tail) {
  const residue = tail.replace(footerKeywords, "");
  return residue.replace(/[^\p{L}]/gu, "").length < 25;
}

export function stripExamFooters(value, field) {
  if (typeof value !== "string" || !contentTextFields.has(field)) {
    return { value, changed: false };
  }

  let current = value;
  let changed = false;

  for (let pass = 0; pass < 3; pass += 1) {
    const at = earliestFooterIndex(current);
    if (at < 1) break;

    const head = trimFooterResidue(current.slice(0, at));
    const tail = current.slice(at);
    if (!head) break;

    if (field !== "statement" || isFooterOnly(tail)) {
      // Alternativas/explicacao: depois do texto real so vem lixo ou conteudo vazado
      // da pagina seguinte — corta ate o fim.
      current = head;
      changed = true;
      break;
    }

    // Enunciado com cabecalho injetado no meio da frase: remove so o trecho do rodape
    // e preserva a continuacao do texto real.
    let cut = tail.length;
    for (const pattern of examFooterMarkers) {
      const match = tail.match(pattern);
      if (match && match.index === 0) {
        cut = Math.max(cut === tail.length ? 0 : cut, match[0].length);
      }
    }
    let rest = tail;
    let removed = 0;
    while (removed < rest.length) {
      const slice = rest.slice(removed);
      const marker = examFooterMarkers
        .map((pattern) => slice.match(pattern))
        .filter((match) => match && match.index <= 4)
        .sort((a, b) => b[0].length - a[0].length)[0];
      if (!marker) break;
      removed += marker.index + marker[0].length;
      const trailing = rest.slice(removed).match(/^\s*[\d•·\-–|ºo°ªa.,;:]*\s*/);
      if (trailing) removed += trailing[0].length;
    }
    if (removed === 0) break;
    current = `${head} ${rest.slice(removed).trimStart()}`.trimEnd();
    changed = true;
  }

  return { value: current, changed };
}

export function hasExamFooter(value) {
  return typeof value === "string" && earliestFooterIndex(value) >= 1;
}

// Caracteres de controle C0 (menos \t \n \r) nunca sao conteudo legitimo — sao
// residuo de fontes com encoding proprio no PDF. Remove e colapsa espaco duplo.
const controlChars = /[ --]/g;

export function hasControlChars(value) {
  return typeof value === "string" && controlChars.test(value);
}

export function stripControlChars(value) {
  if (typeof value !== "string" || !controlChars.test(value)) {
    return { value, changed: false };
  }
  const cleaned = value.replace(controlChars, " ").replace(/[ \t]{2,}/g, " ").trim();
  return { value: cleaned, changed: true };
}

// Prefixo de lixo no inicio do enunciado: rastros de seta/traço que a extracao do PDF
// gera nas quebras de coluna, opcionalmente seguidos de um token mojibake de codigo de
// prova (ex.: "————>>>>—— enemooz Um segmento..."). So corta quando o que sobra recomeca
// num inicio de frase valido — senao o corpo tambem esta corrompido (deixa pro validador).
const leadingGarbage = /^[\s"»«›‹=]*[—–‒―\->»]{2,}[\s"»«›‹=]*(?:enem\w{2,8}[\s"»«›‹=!.,]*)?/i;
const leadingEnemToken = /^[\s"»«›‹=]*enem\w{2,8}[\s"»«›‹=!.,]*/i;

export function stripLeadingGarbage(value) {
  if (typeof value !== "string") return { value, changed: false };
  for (const pattern of [leadingGarbage, leadingEnemToken]) {
    const match = value.match(pattern);
    if (!match || match[0].length === 0) continue;
    const rest = value.slice(match[0].length);
    // so remove se o restante recomeca de forma limpa (maiuscula/parentese/aspas)
    if (/^[A-ZÀ-Ú(“"'0-9]/.test(rest.trimStart())) {
      return { value: rest.trimStart(), changed: true };
    }
  }
  return { value, changed: false };
}

// A extracao de opcoes inline vaza o marcador da alternativa seguinte no fim de cada
// opcao ("...Miami. B", "...cubana. C"). Como e sistematico (o marcador vazado e SEMPRE
// a letra da proxima), removemos so quando >=2 opcoes da questao exibem o padrao — assim
// nao mexemos numa opcao que legitimamente termina numa letra (ex.: formula "... + D").
const optionSequence = ["option_a", "option_b", "option_c", "option_d", "option_e"];
const nextOptionLetter = { option_a: "B", option_b: "C", option_c: "D", option_d: "E" };

export function stripOptionLetterBleed(row) {
  const bleeding = optionSequence
    .slice(0, 4)
    .filter((field) => {
      const value = row[field];
      return typeof value === "string" && new RegExp(`\\s${nextOptionLetter[field]}\\s*$`).test(value);
    });

  if (bleeding.length < 2) return { row, changes: [] };

  const result = { ...row };
  const changes = [];
  for (const field of bleeding) {
    const before = row[field];
    const after = before.replace(new RegExp(`\\s+${nextOptionLetter[field]}\\s*$`), "").trimEnd();
    result[field] = after;
    changes.push({ field, before, after, confidence: "option-letter-bleed", kind: "encoding" });
  }
  return { row: result, changes };
}

export function hasMojibake(value) {
  return typeof value === "string" && mojibakePatterns.some((pattern) => pattern.test(value));
}

export function repairMojibake(value) {
  if (typeof value !== "string") return { value, changed: false, confidence: "none" };

  let current = value.normalize("NFC");
  let changed = current !== value;
  let bestScore = mojibakeScore(current);
  let confidence = changed ? "unicode-normalized" : "none";

  for (let pass = 0; pass < 2 && hasMojibake(current); pass += 1) {
    const candidate = decodeCp1252BytesAsUtf8(current).normalize("NFC");
    const candidateScore = mojibakeScore(candidate);
    if (candidateScore < bestScore && !candidate.includes("�")) {
      current = candidate;
      bestScore = candidateScore;
      changed = true;
      confidence = candidateScore === 0 ? "high" : "medium";
      continue;
    }
    break;
  }

  return { value: current, changed, confidence };
}

export function normalizeQuestionTextFields(row) {
  const normalized = {};
  const changes = [];

  for (const [field, value] of Object.entries(row)) {
    if (typeof value !== "string") {
      normalized[field] = value;
      continue;
    }

    const repaired = urlLikeFields.has(field)
      ? { value: value.normalize("NFC"), changed: value.normalize("NFC") !== value, confidence: "unicode-normalized" }
      : repairMojibake(value);

    const stripped = stripExamFooters(repaired.value, field);
    const decontrolled = contentTextFields.has(field)
      ? stripControlChars(stripped.value)
      : { value: stripped.value, changed: false };
    const deleaded =
      field === "statement"
        ? stripLeadingGarbage(decontrolled.value)
        : { value: decontrolled.value, changed: false };

    normalized[field] = deleaded.value;
    if (repaired.changed) {
      changes.push({
        field,
        before: value,
        after: repaired.value,
        confidence: repaired.confidence,
      });
    }
    if (stripped.changed) {
      changes.push({
        field,
        before: repaired.value,
        after: stripped.value,
        confidence: "footer-stripped",
      });
    }
    if (decontrolled.changed) {
      changes.push({
        field,
        before: stripped.value,
        after: decontrolled.value,
        confidence: "control-stripped",
      });
    }
    if (deleaded.changed) {
      changes.push({
        field,
        before: decontrolled.value,
        after: deleaded.value,
        confidence: "lead-garbage-stripped",
      });
    }
  }

  return { row: normalized, changes };
}

export function normalizeRows(rows) {
  const normalizedRows = [];
  const recordReports = [];

  rows.forEach((row, index) => {
    const textResult = normalizeQuestionTextFields(row);
    const bleedResult = stripOptionLetterBleed(textResult.row);
    const canonical = canonicalizeQuestionTaxonomy(bleedResult.row);
    const taxonomyChanges = [];

    for (const field of ["area", "subject", "topic", "discipline"]) {
      if (canonical[field] !== textResult.row[field]) {
        taxonomyChanges.push({
          field,
          before: textResult.row[field],
          after: canonical[field],
          confidence: "high",
          kind: "taxonomy",
        });
      }
    }

    normalizedRows.push(canonical);
    recordReports.push({
      index,
      question_number: canonical.question_number ?? null,
      year: canonical.year ?? null,
      source: canonical.source ?? null,
      changes: [
        ...textResult.changes.map((change) => ({ ...change, kind: "encoding" })),
        ...bleedResult.changes,
        ...taxonomyChanges,
      ],
    });
  });

  return { rows: normalizedRows, records: recordReports };
}

export function summarizeNormalization(file, rows, normalized) {
  const affectedRecords = normalized.records.filter((record) => record.changes.length > 0);
  const encodingRecords = normalized.records.filter((record) =>
    record.changes.some((change) => change.kind === "encoding"),
  );
  const taxonomyRecords = normalized.records.filter((record) =>
    record.changes.some((change) => change.kind === "taxonomy"),
  );
  const fields = new Map();
  const confidence = new Map();

  for (const record of normalized.records) {
    for (const change of record.changes) {
      fields.set(change.field, (fields.get(change.field) ?? 0) + 1);
      confidence.set(change.confidence, (confidence.get(change.confidence) ?? 0) + 1);
    }
  }

  return {
    file,
    total_records: rows.length,
    affected_records: affectedRecords.length,
    encoding_affected_records: encodingRecords.length,
    taxonomy_affected_records: taxonomyRecords.length,
    fields: Object.fromEntries([...fields.entries()].sort()),
    confidence: Object.fromEntries([...confidence.entries()].sort()),
    examples: affectedRecords.slice(0, 8).map((record) => ({
      index: record.index + 1,
      year: record.year,
      question_number: record.question_number,
      changes: record.changes.slice(0, 4).map((change) => ({
        field: change.field,
        before: truncate(change.before),
        after: truncate(change.after),
        confidence: change.confidence,
        kind: change.kind,
      })),
    })),
  };
}

function mojibakeScore(value) {
  if (!value) return 0;
  let score = 0;
  for (const pattern of mojibakePatterns) {
    const matches = value.match(new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`));
    score += matches?.length ?? 0;
  }
  score += (value.match(/[ÃÂâ]/g) ?? []).length;
  score += (value.match(/[\u0080-\u009f]/g) ?? []).length * 2;
  score += (value.match(/�/g) ?? []).length * 5;
  return score;
}

function decodeCp1252BytesAsUtf8(value) {
  const bytes = [];
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = cp1252Bytes.get(char);
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }
    return value;
  }
  return Buffer.from(bytes).toString("utf8");
}

function truncate(value, max = 180) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function readJson(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (Array.isArray(parsed)) return { rows: parsed, wrapper: null };
  if (Array.isArray(parsed.questions)) return { rows: parsed.questions, wrapper: parsed };
  throw new Error(`Formato JSON nao suportado em ${filePath}`);
}

function writeJson(filePath, rows, wrapper) {
  const output = wrapper ? { ...wrapper, questions: rows } : rows;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const args = { files: [], outDir: "outputs/normalized-imports", write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--file") args.files.push(argv[++index]);
    else if (value === "--out-dir") args.outDir = argv[++index];
    else if (value === "--write") args.write = true;
    else if (value === "--dry-run") args.write = false;
    else if (value === "--help") args.help = true;
  }
  if (!args.files.length) args.files = [...defaultImportFiles];
  return args;
}

function printUsage() {
  console.log(`
Uso:
  node scripts/normalize-question-imports.mjs --dry-run
  node scripts/normalize-question-imports.mjs --file supabase/imports/enem-piloto-matematica.json --write

Saidas:
  outputs/normalized-imports/*.normalized.json
  outputs/normalized-imports/normalization-report.json
`);
}

async function runCli(argv, root = process.cwd()) {
  const args = parseArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }

  const summaries = [];
  for (const file of args.files) {
    const absolute = path.resolve(root, file);
    const { rows, wrapper } = readJson(absolute);
    const normalized = normalizeRows(rows);
    const summary = summarizeNormalization(file, rows, normalized);
    summaries.push(summary);

    if (args.write) {
      const outputName = `${path.basename(file, ".json")}.normalized.json`;
      writeJson(path.resolve(root, args.outDir, outputName), normalized.rows, wrapper);
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: args.write ? "write" : "dry-run",
    files: summaries,
  };

  fs.mkdirSync(path.resolve(root, args.outDir), { recursive: true });
  fs.writeFileSync(
    path.resolve(root, args.outDir, "normalization-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
  return 0;
}

function isCliEntrypoint() {
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isCliEntrypoint()) {
  const exitCode = await runCli(process.argv.slice(2), process.cwd());
  process.exit(exitCode);
}
