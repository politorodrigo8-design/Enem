const neutralTheme = {
  id: "desconhecida",
  label: "Materia",
  area: "Outra area",
  icon: "•",
  color: "#475569",
  background: "#f8fafc",
  text: "#334155",
  border: "#cbd5e1",
  accent: "#64748b",
  selected: "#e2e8f0",
  hover: "#f1f5f9",
};

export const areaThemes = {
  linguagens: {
    id: "linguagens",
    label: "Linguagens",
    icon: "L",
    color: "#be123c",
    background: "#fff1f2",
    text: "#9f1239",
    border: "#fecdd3",
    accent: "#e11d48",
    selected: "#ffe4e6",
    hover: "#fff1f2",
  },
  humanas: {
    id: "humanas",
    label: "Ciencias Humanas",
    icon: "H",
    color: "#b45309",
    background: "#fffbeb",
    text: "#92400e",
    border: "#fde68a",
    accent: "#d97706",
    selected: "#fef3c7",
    hover: "#fffbeb",
  },
  natureza: {
    id: "natureza",
    label: "Ciencias da Natureza",
    icon: "N",
    color: "#047857",
    background: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0",
    accent: "#059669",
    selected: "#d1fae5",
    hover: "#ecfdf5",
  },
  matematica: {
    id: "matematica",
    label: "Matematica",
    icon: "M",
    color: "#1d4ed8",
    background: "#eff6ff",
    text: "#1e40af",
    border: "#bfdbfe",
    accent: "#2563eb",
    selected: "#dbeafe",
    hover: "#eff6ff",
  },
  redacao: {
    id: "redacao",
    label: "Redacao",
    icon: "R",
    color: "#be185d",
    background: "#fdf2f8",
    text: "#9d174d",
    border: "#fbcfe8",
    accent: "#db2777",
    selected: "#fce7f3",
    hover: "#fdf2f8",
  },
};

export const subjectThemes = {
  lingua_portuguesa: {
    ...areaThemes.linguagens,
    id: "lingua_portuguesa",
    label: "Lingua Portuguesa",
    area: "Linguagens",
    icon: "LP",
    color: "#dc2626",
    background: "#fef2f2",
    text: "#991b1b",
    border: "#fecaca",
    accent: "#ef4444",
    selected: "#fee2e2",
    hover: "#fef2f2",
  },
  literatura: {
    ...areaThemes.linguagens,
    id: "literatura",
    label: "Literatura",
    area: "Linguagens",
    icon: "Lt",
    color: "#db2777",
    background: "#fdf2f8",
    text: "#9d174d",
    border: "#fbcfe8",
    accent: "#ec4899",
    selected: "#fce7f3",
    hover: "#fdf2f8",
  },
  interpretacao_textual: {
    ...areaThemes.linguagens,
    id: "interpretacao_textual",
    label: "Interpretacao textual",
    area: "Linguagens",
    icon: "T",
    color: "#ea580c",
    background: "#fff7ed",
    text: "#9a3412",
    border: "#fed7aa",
    accent: "#f97316",
    selected: "#ffedd5",
    hover: "#fff7ed",
  },
  gramatica: {
    ...areaThemes.linguagens,
    id: "gramatica",
    label: "Gramatica",
    area: "Linguagens",
    icon: "G",
    color: "#9f1239",
    background: "#fff1f2",
    text: "#881337",
    border: "#fecdd3",
    accent: "#be123c",
    selected: "#ffe4e6",
    hover: "#fff1f2",
  },
  redacao: {
    ...areaThemes.redacao,
    area: "Linguagens",
  },
  ingles: {
    ...areaThemes.linguagens,
    id: "ingles",
    label: "Ingles",
    area: "Linguagens",
    icon: "En",
    color: "#ca8a04",
    background: "#fefce8",
    text: "#854d0e",
    border: "#fef08a",
    accent: "#eab308",
    selected: "#fef9c3",
    hover: "#fefce8",
  },
  espanhol: {
    ...areaThemes.linguagens,
    id: "espanhol",
    label: "Espanhol",
    area: "Linguagens",
    icon: "Es",
    color: "#c2410c",
    background: "#fff7ed",
    text: "#9a3412",
    border: "#fed7aa",
    accent: "#ea580c",
    selected: "#ffedd5",
    hover: "#fff7ed",
  },
  artes: {
    ...areaThemes.linguagens,
    id: "artes",
    label: "Artes",
    area: "Linguagens",
    icon: "A",
    color: "#b45309",
    background: "#fffbeb",
    text: "#92400e",
    border: "#fde68a",
    accent: "#f59e0b",
    selected: "#fef3c7",
    hover: "#fffbeb",
  },
  educacao_fisica: {
    ...areaThemes.linguagens,
    id: "educacao_fisica",
    label: "Educacao Fisica",
    area: "Linguagens",
    icon: "EF",
    color: "#7e22ce",
    background: "#faf5ff",
    text: "#6b21a8",
    border: "#e9d5ff",
    accent: "#9333ea",
    selected: "#f3e8ff",
    hover: "#faf5ff",
  },
  tecnologias: {
    ...areaThemes.linguagens,
    id: "tecnologias",
    label: "Tecnologias",
    area: "Linguagens",
    icon: "TI",
    color: "#0891b2",
    background: "#ecfeff",
    text: "#155e75",
    border: "#a5f3fc",
    accent: "#06b6d4",
    selected: "#cffafe",
    hover: "#ecfeff",
  },
  historia: {
    ...areaThemes.humanas,
    id: "historia",
    label: "Historia",
    area: "Ciencias Humanas",
    icon: "Hi",
    color: "#c2410c",
    background: "#fff7ed",
    text: "#9a3412",
    border: "#fed7aa",
    accent: "#ea580c",
    selected: "#ffedd5",
    hover: "#fff7ed",
  },
  historia_brasil: {
    ...areaThemes.humanas,
    id: "historia_brasil",
    label: "Historia do Brasil",
    area: "Ciencias Humanas",
    icon: "HB",
    color: "#b45309",
    background: "#fffbeb",
    text: "#92400e",
    border: "#fde68a",
    accent: "#d97706",
    selected: "#fef3c7",
    hover: "#fffbeb",
  },
  historia_geral: {
    ...areaThemes.humanas,
    id: "historia_geral",
    label: "Historia Geral",
    area: "Ciencias Humanas",
    icon: "HG",
    color: "#92400e",
    background: "#fffbeb",
    text: "#78350f",
    border: "#fde68a",
    accent: "#b45309",
    selected: "#fef3c7",
    hover: "#fffbeb",
  },
  geografia: {
    ...areaThemes.humanas,
    id: "geografia",
    label: "Geografia",
    area: "Ciencias Humanas",
    icon: "Geo",
    color: "#059669",
    background: "#ecfdf5",
    text: "#047857",
    border: "#a7f3d0",
    accent: "#10b981",
    selected: "#d1fae5",
    hover: "#ecfdf5",
  },
  filosofia: {
    ...areaThemes.humanas,
    id: "filosofia",
    label: "Filosofia",
    area: "Ciencias Humanas",
    icon: "Fi",
    color: "#a16207",
    background: "#fefce8",
    text: "#854d0e",
    border: "#fde68a",
    accent: "#ca8a04",
    selected: "#fef9c3",
    hover: "#fefce8",
  },
  sociologia: {
    ...areaThemes.humanas,
    id: "sociologia",
    label: "Sociologia",
    area: "Ciencias Humanas",
    icon: "So",
    color: "#d97706",
    background: "#fffbeb",
    text: "#92400e",
    border: "#fde68a",
    accent: "#f59e0b",
    selected: "#fef3c7",
    hover: "#fffbeb",
  },
  biologia: {
    ...areaThemes.natureza,
    id: "biologia",
    label: "Biologia",
    area: "Ciencias da Natureza",
    icon: "Bio",
    color: "#16a34a",
    background: "#f0fdf4",
    text: "#166534",
    border: "#bbf7d0",
    accent: "#22c55e",
    selected: "#dcfce7",
    hover: "#f0fdf4",
  },
  fisica: {
    ...areaThemes.natureza,
    id: "fisica",
    label: "Fisica",
    area: "Ciencias da Natureza",
    icon: "F",
    color: "#4338ca",
    background: "#eef2ff",
    text: "#3730a3",
    border: "#c7d2fe",
    accent: "#6366f1",
    selected: "#e0e7ff",
    hover: "#eef2ff",
  },
  quimica: {
    ...areaThemes.natureza,
    id: "quimica",
    label: "Quimica",
    area: "Ciencias da Natureza",
    icon: "Q",
    color: "#7c3aed",
    background: "#f5f3ff",
    text: "#6d28d9",
    border: "#ddd6fe",
    accent: "#8b5cf6",
    selected: "#ede9fe",
    hover: "#f5f3ff",
  },
  matematica: {
    ...areaThemes.matematica,
    area: "Matematica",
  },
  algebra: {
    ...areaThemes.matematica,
    id: "algebra",
    label: "Algebra",
    area: "Matematica",
    icon: "Alg",
    color: "#2563eb",
    background: "#eff6ff",
    text: "#1d4ed8",
    border: "#bfdbfe",
    accent: "#3b82f6",
    selected: "#dbeafe",
    hover: "#eff6ff",
  },
  geometria: {
    ...areaThemes.matematica,
    id: "geometria",
    label: "Geometria",
    area: "Matematica",
    icon: "Geo",
    color: "#4f46e5",
    background: "#eef2ff",
    text: "#3730a3",
    border: "#c7d2fe",
    accent: "#6366f1",
    selected: "#e0e7ff",
    hover: "#eef2ff",
  },
  estatistica: {
    ...areaThemes.matematica,
    id: "estatistica",
    label: "Estatistica",
    area: "Matematica",
    icon: "Est",
    color: "#0284c7",
    background: "#f0f9ff",
    text: "#075985",
    border: "#bae6fd",
    accent: "#0ea5e9",
    selected: "#e0f2fe",
    hover: "#f0f9ff",
  },
  probabilidade: {
    ...areaThemes.matematica,
    id: "probabilidade",
    label: "Probabilidade",
    area: "Matematica",
    icon: "P",
    color: "#0f766e",
    background: "#f0fdfa",
    text: "#115e59",
    border: "#99f6e4",
    accent: "#14b8a6",
    selected: "#ccfbf1",
    hover: "#f0fdfa",
  },
  matematica_financeira: {
    ...areaThemes.matematica,
    id: "matematica_financeira",
    label: "Matematica financeira",
    area: "Matematica",
    icon: "MF",
    color: "#047857",
    background: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0",
    accent: "#10b981",
    selected: "#d1fae5",
    hover: "#ecfdf5",
  },
  funcoes: {
    ...areaThemes.matematica,
    id: "funcoes",
    label: "Funcoes",
    area: "Matematica",
    icon: "fx",
    color: "#1d4ed8",
    background: "#eff6ff",
    text: "#1e40af",
    border: "#bfdbfe",
    accent: "#2563eb",
    selected: "#dbeafe",
    hover: "#eff6ff",
  },
  trigonometria: {
    ...areaThemes.matematica,
    id: "trigonometria",
    label: "Trigonometria",
    area: "Matematica",
    icon: "Tri",
    color: "#6d28d9",
    background: "#f5f3ff",
    text: "#5b21b6",
    border: "#ddd6fe",
    accent: "#7c3aed",
    selected: "#ede9fe",
    hover: "#f5f3ff",
  },
};

const aliases = new Map();

function addAliases(id, values) {
  for (const value of values) aliases.set(normalizeKey(value), id);
}

addAliases("lingua_portuguesa", [
  "Portugues",
  "Lingua Portuguesa",
  "Portugues e Literatura",
  "Linguagens",
]);
addAliases("literatura", ["Literatura"]);
addAliases("interpretacao_textual", [
  "Interpretacao de Texto",
  "Interpretacao textual",
  "Interpretacao de graficos e tabelas",
]);
addAliases("gramatica", ["Gramatica", "Norma e gramatica contextualizada"]);
addAliases("redacao", ["Redacao", "Redação"]);
addAliases("ingles", ["Ingles", "Lingua Inglesa", "Interpretação de texto em inglês"]);
addAliases("espanhol", ["Espanhol", "Lingua Espanhola", "Interpretação de texto em espanhol"]);
addAliases("artes", ["Artes", "Artes visuais e musica"]);
addAliases("educacao_fisica", ["Educacao Fisica", "Educação Física"]);
addAliases("tecnologias", [
  "Tecnologias",
  "Tecnologias da Informacao e Comunicacao",
  "Tecnologias da informação e comunicação",
]);
addAliases("historia", ["Historia", "Ciências Humanas"]);
addAliases("historia_brasil", ["Historia do Brasil", "Brasil Colonia", "Brasil Imperio"]);
addAliases("historia_geral", ["Historia Geral", "Idade Contemporanea"]);
addAliases("geografia", ["Geografia"]);
addAliases("filosofia", ["Filosofia"]);
addAliases("sociologia", ["Sociologia"]);
addAliases("biologia", ["Biologia", "Ciencias Biologicas"]);
addAliases("fisica", ["Fisica"]);
addAliases("quimica", ["Quimica"]);
addAliases("matematica", ["Matematica", "Matematica e suas Tecnologias"]);
addAliases("algebra", ["Algebra", "Equacoes e inequacoes"]);
addAliases("geometria", ["Geometria", "Geometria plana", "Geometria espacial", "Geometria analitica"]);
addAliases("estatistica", ["Estatistica"]);
addAliases("probabilidade", ["Probabilidade", "Analise combinatoria"]);
addAliases("matematica_financeira", ["Matematica Financeira"]);
addAliases("funcoes", ["Funcoes"]);
addAliases("trigonometria", ["Trigonometria"]);

export function normalizeSubjectName(subjectName) {
  const key = normalizeKey(subjectName);
  return aliases.get(key) ?? key.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function getSubjectTheme(subjectName) {
  const id = normalizeSubjectName(subjectName);
  const theme = subjectThemes[id];
  if (!theme) {
    return {
      ...neutralTheme,
      id,
      label: getSubjectLabel(subjectName),
      unmapped: true,
    };
  }
  return theme;
}

export function getAreaTheme(areaName) {
  const key = normalizeKey(areaName);
  if (key.includes("linguagens")) return areaThemes.linguagens;
  if (key.includes("humanas")) return areaThemes.humanas;
  if (key.includes("natureza")) return areaThemes.natureza;
  if (key.includes("matematica")) return areaThemes.matematica;
  if (key.includes("redacao")) return areaThemes.redacao;
  return { ...neutralTheme, label: getSubjectLabel(areaName), unmapped: true };
}

export function getSubjectLabel(subjectName) {
  const raw = String(subjectName ?? "").trim();
  if (!raw) return neutralTheme.label;
  return raw;
}

export function getSubjectIcon(subjectName) {
  return getSubjectTheme(subjectName).icon;
}

export function getThemeStyle(theme) {
  return {
    "--subject-color": theme.color,
    "--subject-bg": theme.background,
    "--subject-text": theme.text,
    "--subject-border": theme.border,
    "--subject-accent": theme.accent,
  };
}

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/\s+/g, " ")
    .trim();
}
