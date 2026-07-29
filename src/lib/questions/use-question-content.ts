"use client";

import { useEffect, useRef, useState } from "react";
import { loadQuestionContentAction } from "@/lib/actions/questions";
import type { PracticeQuestionContent } from "@/lib/db/types";

export type QuestionContentMap = Record<string, PracticeQuestionContent>;

/**
 * Enunciado e alternativas da questão aberta, buscados sob demanda.
 *
 * O índice do acervo chega sem conteúdo (ver PracticeQuestionRecord), então a
 * tela pede o texto da questão atual e o das vizinhas — quando o aluno avança,
 * a próxima já está em mãos e a troca é instantânea.
 */
export function useQuestionContent(questionIds: Array<string | null | undefined>) {
  // A lista de ids vira string para servir de dependência estável: um array novo
  // a cada render dispararia o efeito sem parar.
  const requestedKey = questionIds.filter(Boolean).join(",");
  const [content, setContent] = useState<QuestionContentMap>({});
  const requestedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const ids = requestedKey ? requestedKey.split(",") : [];
    const missing = ids.filter((id) => !requestedRef.current.has(id));
    if (!missing.length) return;

    for (const id of missing) requestedRef.current.add(id);
    let active = true;

    loadQuestionContentAction(missing)
      .then((loaded) => {
        if (!active) return;
        setContent((current) => {
          const next = { ...current };
          for (const item of loaded) next[item.id] = item;
          return next;
        });
      })
      .catch(() => {
        // Solta os ids para que a próxima navegação tente de novo, em vez de
        // deixar a questão presa num esqueleto permanente.
        for (const id of missing) requestedRef.current.delete(id);
      });

    return () => {
      active = false;
    };
  }, [requestedKey]);

  return content;
}

/**
 * A questão aberta mais as vizinhas que valem pré-carregar: as próximas, porque
 * é para onde o aluno vai, e a anterior, para quem volta conferir.
 */
export function questionContentWindow(
  ids: string[],
  index: number,
  { ahead = 2, behind = 1 } = {},
) {
  return ids.slice(Math.max(0, index - behind), index + ahead + 1);
}
