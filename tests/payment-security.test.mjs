import test from "node:test";
import assert from "node:assert/strict";
import {
  canCreateMercadoPagoCheckout,
  getMercadoPagoCredentialProblem,
  isPaymentSiteUrlSafe,
  isTrustedCheckoutOrigin,
} from "../src/lib/services/payment-security.mjs";

test("checkout Mercado Pago exige produto ativo, liberado e provedor correto", () => {
  assert.equal(
    canCreateMercadoPagoCheckout({
      active: true,
      launch_ready: true,
      checkout_provider: "mercado_pago",
    }),
    true,
  );
  assert.equal(
    canCreateMercadoPagoCheckout({
      active: true,
      launch_ready: false,
      checkout_provider: "mercado_pago",
    }),
    false,
  );
  assert.equal(
    canCreateMercadoPagoCheckout({
      active: true,
      launch_ready: true,
      checkout_provider: "manual",
    }),
    false,
  );
});

test("checkout aceita apenas origem confiavel em producao", () => {
  assert.equal(
    isTrustedCheckoutOrigin({
      origin: "https://pontuaenem.example",
      secFetchSite: "same-origin",
      siteUrl: "https://pontuaenem.example",
      nodeEnv: "production",
    }),
    true,
  );
  assert.equal(
    isTrustedCheckoutOrigin({
      origin: "https://attacker.example",
      secFetchSite: "cross-site",
      siteUrl: "https://pontuaenem.example",
      nodeEnv: "production",
    }),
    false,
  );
  assert.equal(
    isTrustedCheckoutOrigin({
      origin: null,
      secFetchSite: null,
      siteUrl: "https://pontuaenem.example",
      nodeEnv: "production",
    }),
    false,
  );
});

test("URL publica de pagamento precisa ser HTTPS fora do ambiente local", () => {
  assert.equal(isPaymentSiteUrlSafe("https://pontuaenem.example", "production"), true);
  assert.equal(isPaymentSiteUrlSafe("http://pontuaenem.example", "production"), false);
  assert.equal(isPaymentSiteUrlSafe("http://localhost:3000", "development"), true);
});

test("access token nao pode ser exposto como public key", () => {
  assert.equal(
    getMercadoPagoCredentialProblem({ accessToken: "", publicKey: "" }),
    "missing_access_token",
  );
  assert.equal(
    getMercadoPagoCredentialProblem({ accessToken: "secret", publicKey: "secret" }),
    "public_key_matches_access_token",
  );
  assert.equal(
    getMercadoPagoCredentialProblem({ accessToken: "secret", publicKey: "public" }),
    null,
  );
});
