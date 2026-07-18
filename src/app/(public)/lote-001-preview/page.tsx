import fs from "node:fs";
import path from "node:path";
import { BatchPreviewClient } from "./batch-preview-client";

const importFiles = [
  "enem-piloto-matematica.json",
  "enem-piloto-natureza.json",
  "enem-piloto-humanas.json",
  "enem-piloto-linguagens.json",
];

export default function Lote001PreviewPage() {
  const questions = importFiles.flatMap((fileName) => {
    const filePath = path.join(process.cwd(), "supabase", "imports", fileName);
    const rows = JSON.parse(fs.readFileSync(filePath, "utf8")) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      statement: String(row.statement || ""),
      area: String(row.area || ""),
      subject: String(row.subject || ""),
      topic: String(row.topic || ""),
      difficulty: String(row.difficulty || ""),
      source: String(row.source || ""),
      question_number: Number(row.question_number || 0),
      year: Number(row.year || 0),
      explanation: String(row.explanation || ""),
      correct_option: String(row.correct_option || ""),
      media_url: typeof row.media_url === "string" ? row.media_url : null,
      media_alt: typeof row.media_alt === "string" ? row.media_alt : null,
      media_width: toDimension(row.media_width),
      media_height: toDimension(row.media_height),
      options: ["A", "B", "C", "D", "E"].map((option) => ({
        option_key: option,
        option_text: String(row[`option_${option.toLowerCase()}`] || ""),
      })),
    }));
  });

  return <BatchPreviewClient questions={questions} />;
}

function toDimension(value: unknown): number | "" {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : "";
}
