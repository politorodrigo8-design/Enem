import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fachada de escrita para o cliente de service role.
 *
 * O tipo `Database` do projeto declara `Update: Partial<Insert>`, o que faz o
 * supabase-js resolver os argumentos de `insert`/`update` como `never` — as
 * leituras continuam tipadas, mas nenhuma escrita compila. Esta fachada
 * descreve só o que as escritas administrativas usam, mantendo a conversão em
 * um ponto único em vez de espalhar `as any` pelas actions.
 */
type AdminQueryResult = {
  data: Record<string, unknown> | Record<string, unknown>[] | null;
  error: { message: string; code?: string } | null;
};

type AdminSingleQueryResult = {
  data: Record<string, unknown> | null;
  error: { message: string; code?: string } | null;
};

export type AdminQuery = {
  upsert: (values: Record<string, unknown>, options?: Record<string, string>) => AdminQuery;
  insert: (values: Record<string, unknown>) => AdminQuery;
  update: (values: Record<string, unknown>) => AdminQuery;
  select: (columns: string) => AdminQuery;
  eq: (column: string, value: unknown) => AdminQuery;
  single: () => Promise<AdminSingleQueryResult>;
  maybeSingle: () => Promise<AdminSingleQueryResult>;
  then: Promise<AdminQueryResult>["then"];
};

export type AdminWriter = {
  from: (table: string) => AdminQuery;
};

/** Cliente de service role com a fachada de escrita aplicada. */
export function createAdminWriter(): AdminWriter {
  return createAdminClient() as unknown as AdminWriter;
}

/** Converte um cliente já criado (evita instanciar duas vezes na mesma action). */
export function asAdminWriter(client: unknown): AdminWriter {
  return client as AdminWriter;
}
