"use server";

import { getPracticeQuestionContent } from "@/lib/db/queries";
import type { PracticeQuestionContent } from "@/lib/db/types";

// Teto por chamada: a tela pede a questão aberta e as vizinhas, nunca um lote
// grande. Um pedido maior que isso é engano de chamador — ou tentativa de
// baixar o acervo inteiro por uma porta lateral.
const maxContentBatch = 12;

/**
 * Enunciado e alternativas das questões pedidas. O índice do acervo viaja sem
 * conteúdo; esta action entrega só o que está na tela.
 *
 * Não devolve gabarito nem resolução: isso continua saindo apenas de
 * submitQuestionAnswerAction, depois de o aluno responder.
 */
export async function loadQuestionContentAction(
  questionIds: string[],
): Promise<PracticeQuestionContent[]> {
  const ids = Array.from(
    new Set((questionIds ?? []).filter((id) => typeof id === "string" && id)),
  ).slice(0, maxContentBatch);

  if (!ids.length) return [];
  return getPracticeQuestionContent(ids);
}
