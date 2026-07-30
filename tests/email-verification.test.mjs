import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authAction = readFileSync(
  new URL("../src/lib/actions/auth.ts", import.meta.url),
  "utf8",
);
const loginPage = readFileSync(
  new URL("../src/app/(auth)/login/page.tsx", import.meta.url),
  "utf8",
);
const supabaseConfig = readFileSync(
  new URL("../supabase/config.toml", import.meta.url),
  "utf8",
);

test("cadastro exige verificacao de email antes do checkout", () => {
  assert.match(supabaseConfig, /enable_confirmations = true/);
  assert.match(authAction, /emailConfirmationRedirectTo/);
  assert.match(authAction, /emailRedirectTo: emailConfirmationRedirectTo\(\)/);
  assert.match(authAction, /auth\/callback\?next=\/checkout/);
  assert.match(authAction, /requiresEmailVerification: true/);
  assert.match(authAction, /resendEmailVerificationAction/);
  assert.match(authAction, /supabase\.auth\.resend\(\{/);
  assert.match(authAction, /operation: "auth\.resend_email_verification"/);
  assert.match(authAction, /limit: 3/);
  assert.match(authAction, /windowSeconds: 60 \* 60/);
});

test("login mostra estado de verificacao e permite reenviar confirmacao", () => {
  assert.match(authAction, /Email not confirmed/);
  assert.match(authAction, /requiresEmailVerification: true/);
  assert.match(loginPage, /type Mode = "login" \| "signup" \| "reset" \| "verify"/);
  assert.match(loginPage, /mode === "verify"/);
  assert.match(loginPage, /handleResendVerification/);
  assert.match(loginPage, /resendEmailVerificationAction/);
  // O e-mail passou a levar um código, então o botão reenvia código, não link.
  assert.match(loginPage, /Enviar outro código/);
});

test("redirects de confirmacao ficam restritos aos dominios esperados", () => {
  assert.match(supabaseConfig, /"https:\/\/pontuaenem\.com\.br\/auth\/callback"/);
  assert.match(supabaseConfig, /"https:\/\/www\.pontuaenem\.com\.br\/auth\/callback"/);
  assert.match(supabaseConfig, /"http:\/\/localhost:3000\/auth\/callback"/);
  assert.match(supabaseConfig, /"http:\/\/127\.0\.0\.1:3000\/auth\/callback"/);
  assert.doesNotMatch(supabaseConfig, /https:\/\/127\.0\.0\.1:3000/);
  assert.doesNotMatch(supabaseConfig, /\*\/auth\/callback/);
});
