import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/020_persistent_rate_limits.sql", import.meta.url),
  "utf8",
);

test("migration 020 cria buckets persistentes sem expor identificador bruto", () => {
  assert.match(migration, /create table if not exists public\.rate_limit_buckets/);
  assert.match(migration, /identifier_hash text not null/);
  assert.match(migration, /identifier_hash ~ '\^\[a-f0-9\]\{64\}\$'/);
  assert.doesNotMatch(migration, /email text|ip text|user_id uuid/);
});

test("consume_rate_limit reseta janela expirada e incrementa janela ativa", () => {
  assert.match(migration, /create or replace function public\.consume_rate_limit/);
  assert.match(migration, /on conflict \(operation, identifier_hash\)/);
  assert.match(migration, /when public\.rate_limit_buckets\.expires_at <= now_value then 1/);
  assert.match(migration, /else public\.rate_limit_buckets\.count \+ 1/);
});

test("rate limit retorna retry-after e bloqueia execucao client-side", () => {
  assert.match(migration, /retry_after_seconds := case/);
  assert.match(migration, /if auth\.role\(\) <> 'service_role' then/);
  assert.match(migration, /revoke all on function public\.consume_rate_limit\(text, text, integer, integer\)\s+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.consume_rate_limit\(text, text, integer, integer\)\s+to service_role/);
});
