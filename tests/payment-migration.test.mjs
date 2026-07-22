import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const creditPackageMigration = readFileSync(
  new URL("../supabase/migrations/018_credit_packages_checkout.sql", import.meta.url),
  "utf8",
);

test("migration 018 semeia pacotes adicionais de creditos", () => {
  assert.match(creditPackageMigration, /add column if not exists product_kind/);
  assert.match(creditPackageMigration, /add column if not exists credit_amount/);
  assert.match(creditPackageMigration, /'creditos-20'/);
  assert.match(creditPackageMigration, /'creditos-50'/);
  assert.match(creditPackageMigration, /'creditos-100'/);
  assert.match(creditPackageMigration, /'credit_package'/);
  assert.match(creditPackageMigration, /credit_amount > 0/);
});

test("migration 018 credita compra avulsa uma vez por pedido aprovado", () => {
  assert.match(creditPackageMigration, /target_product\.product_kind = 'credit_package'/);
  assert.match(creditPackageMigration, /balance = balance \+ target_product\.credit_amount/);
  assert.match(creditPackageMigration, /reason = 'purchase'/);
  assert.match(creditPackageMigration, /reference_type = 'order'/);
  assert.match(creditPackageMigration, /reference_id = target_order\.id/);
  assert.match(creditPackageMigration, /credit_ledger_one_purchase_per_order_unique/);
  assert.match(creditPackageMigration, /if not found then[\s\S]*insert into public\.credit_ledger/);
  assert.match(creditPackageMigration, /'credit_package_purchased'/);
});

test("migration 018 nao revoga acesso ao reembolsar pacote de creditos", () => {
  const revokeStart = creditPackageMigration.indexOf(
    "create or replace function public.revoke_paid_access_for_order",
  );
  assert.notEqual(revokeStart, -1);
  const revokeSection = creditPackageMigration.slice(revokeStart);
  const packageReturn = revokeSection.indexOf(
    "if target_product.product_kind = 'credit_package' then",
  );
  const profileUpdate = revokeSection.indexOf("update public.profiles");

  assert.notEqual(packageReturn, -1);
  assert.notEqual(profileUpdate, -1);
  assert.ok(packageReturn < profileUpdate);
});
