import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/022_legal_document_acceptances.sql", import.meta.url),
  "utf8",
);
const authSchema = readFileSync(new URL("../src/lib/schemas/auth.ts", import.meta.url), "utf8");
const authAction = readFileSync(new URL("../src/lib/actions/auth.ts", import.meta.url), "utf8");
const paymentRoute = readFileSync(
  new URL("../src/app/api/payments/create/route.ts", import.meta.url),
  "utf8",
);
const loginPage = readFileSync(
  new URL("../src/app/(auth)/login/page.tsx", import.meta.url),
  "utf8",
);
const checkoutButton = readFileSync(
  new URL("../src/app/(public)/checkout/checkout-button.tsx", import.meta.url),
  "utf8",
);
const creditButton = readFileSync(
  new URL("../src/components/dashboard/credit-package-checkout-button.tsx", import.meta.url),
  "utf8",
);
const publicLegalPages = [
  "../src/app/(public)/termos/page.tsx",
  "../src/app/(public)/privacidade/page.tsx",
  "../src/app/(public)/reembolso/page.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

test("migration cria versões e aceites legais com RLS restritiva", () => {
  assert.match(migration, /create table if not exists public\.legal_document_versions/);
  assert.match(migration, /create table if not exists public\.legal_acceptances/);
  assert.match(migration, /terms_of_use/);
  assert.match(migration, /privacy_policy/);
  assert.match(migration, /refund_policy/);
  assert.match(migration, /acceptance_context in \('signup', 'main_checkout', 'credit_checkout', 'policy_reacceptance'\)/);
  assert.match(migration, /legal_acceptances_no_client_insert/);
  assert.match(migration, /with check \(false\)/);
  assert.match(migration, /legal_acceptances_no_client_update/);
  assert.match(migration, /legal_acceptances_no_client_delete/);
  assert.match(migration, /using \(user_id = auth\.uid\(\)\)/);
});

test("migration ajusta créditos de pacote reembolsado sem duplicidade", () => {
  assert.match(migration, /'purchase_refund'/);
  assert.match(migration, /credit_ledger_one_purchase_refund_per_order_unique/);
  assert.match(migration, /refundable_credits := least\(account\.balance, coalesce\(target_product\.credit_amount, 0\)\)/);
  assert.match(migration, /balance = balance - refundable_credits/);
});

test("cadastro exige versões legais e registra os três documentos no servidor", () => {
  assert.match(authSchema, /legalAcceptanceSchema/);
  assert.match(authSchema, /terms_of_use/);
  assert.match(authSchema, /privacy_policy/);
  assert.match(authSchema, /refund_policy/);
  assert.match(authAction, /recordCurrentLegalAcceptances/);
  assert.match(authAction, /context: "signup"/);
  assert.match(authAction, /deleteUser\(data\.user\.id\)/);
});

test("login não contém aceite implícito e cadastro usa checkboxes obrigatórias", () => {
  assert.doesNotMatch(loginPage, /Ao continuar, você concorda/);
  assert.match(loginPage, /Li e concordo com os/);
  assert.match(loginPage, /Declaro que li e estou ciente/);
  assert.match(loginPage, /disabled=\{pending \|\| !signupLegalReady\}/);
});

test("checkouts bloqueiam sem aceite e servidor recusa payload ausente", () => {
  assert.match(paymentRoute, /validateLegalAcceptancePayload\(body\.legalAcceptance\)/);
  assert.match(paymentRoute, /context: product\.product_kind === "credit_package" \? "credit_checkout" : "main_checkout"/);
  assert.match(paymentRoute, /orderId: createdOrder\.id/);
  assert.match(checkoutButton, /disabled=\{isDisabled\}/);
  assert.match(checkoutButton, /legalAcceptance: currentLegalAcceptanceVersions\(\)/);
  assert.match(creditButton, /role="dialog"/);
  assert.match(creditButton, /Continuar para o pagamento/);
  assert.match(creditButton, /productSlug/);
});

test("documentos públicos não mantêm linguagem provisória interna", () => {
  const forbidden = /fase inicial|não foi identificado no código|deve ser revisado|devem ser revisados|antes das vendas|abertura de vendas/i;
  for (const content of publicLegalPages) {
    assert.doesNotMatch(content, forbidden);
  }
});
