import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const authActionSource = read("../src/lib/actions/auth.ts");
const authSchemaSource = read("../src/lib/schemas/auth.ts");
const loginPageSource = read("../src/app/(auth)/login/page.tsx");
const confirmationTemplate = read("../supabase/templates/confirmation.html");
const supabaseConfig = read("../supabase/config.toml");
const authJsClientTypes = read(
  "../node_modules/@supabase/auth-js/dist/module/GoTrueClient.d.ts",
);
const authJsErrorCodes = read(
  "../node_modules/@supabase/auth-js/dist/module/lib/error-codes.d.ts",
);

// O JSDoc do @supabase/auth-js 2.110.3 diz, verbatim, que os tipos `signup` e
// `magiclink` estão DEPRECADOS no verifyOtp e que o tipo de confirmação de
// cadastro por e-mail é `email`. Se um upgrade do pacote mudar isso, este teste
// avisa antes de a verificação quebrar em produção.
test("o tipo do verifyOtp confere com o pacote instalado", () => {
  assert.match(authJsClientTypes, /`signup` and `magiclink` types are deprecated/);
  assert.match(authJsClientTypes, /verifyOtp\(\{ email, token, type: 'email'\}\)/);
  const inicio = authActionSource.indexOf("export async function verifyEmailOtpAction");
  const fim = authActionSource.indexOf("export async function resendEmailVerificationAction");
  assert.ok(inicio > -1 && fim > inicio, "nao consegui isolar a acao de verificacao");
  const acao = authActionSource.slice(inicio, fim);

  assert.match(acao, /type: "email"/);
  assert.doesNotMatch(acao, /type: "signup"/);
});

// resend usa outro enum: ResendParams aceita só 'signup' | 'email_change'.
test("o reenvio continua usando o tipo signup, que e o correto para ele", () => {
  assert.match(authActionSource, /resend\(\{[\s\S]{0,80}type: "signup"/);
});

// Produção manda OTP de 8 dígitos e o stack local manda 6. Validar comprimento
// fixo passaria em todo teste local e rejeitaria 100% dos cadastros reais.
test("o codigo aceita a faixa de 6 a 10 digitos, nunca um tamanho fixo", () => {
  assert.match(supabaseConfig, /otp_length = 8/);
  assert.match(supabaseConfig, /otp_length = 6/);
  assert.match(authSchemaSource, /\\d\{6,10\}/);
});

// O schema vive num .ts e o runner é node --test puro, sem loader de TypeScript
// (mesmo padrão dos outros testes do projeto: leem o fonte). Aqui extraio a
// regex declarada e valido o comportamento dela com as entradas reais.
test("o schema do codigo recusa entrada nao numerica", () => {
  const declarada = authSchemaSource.match(/\.regex\((\/[^/]+\/)/);
  assert.ok(declarada, "nao encontrei a regex do token no schema");
  const padrao = new RegExp(declarada[1].slice(1, -1));

  assert.ok(padrao.test("123456"), "6 digitos (local) tem que passar");
  assert.ok(padrao.test("12345678"), "8 digitos (producao) tem que passar");
  assert.ok(!padrao.test("12345"));
  assert.ok(!padrao.test("abcdef"));
  assert.ok(!padrao.test("12345678901"));
  assert.ok(!padrao.test("123 456"));
});

// Casar por substring da mensagem não distingue codigo errado de codigo
// expirado — os dois caíam no genérico e viravam ticket de suporte.
test("erros de auth sao mapeados por code, com codigos que existem no pacote", () => {
  for (const code of [
    "otp_expired",
    "over_email_send_rate_limit",
    "over_request_rate_limit",
    "user_already_exists",
    "invalid_credentials",
    "email_not_confirmed",
  ]) {
    assert.match(authJsErrorCodes, new RegExp(`'${code}'`), `${code} nao existe no auth-js`);
    assert.match(authActionSource, new RegExp(`${code}:`), `${code} nao mapeado`);
  }
  assert.match(authActionSource, /function authErrorCode/);
});

test("a acao de verificacao tem rate limit proprio", () => {
  const action = authActionSource.slice(authActionSource.indexOf("verifyEmailOtpAction"));
  assert.match(action, /checkRateLimit/);
  assert.match(action, /auth\.verify_email_otp/);
});

// O template precisa entregar o codigo; sem {{ .Token }} a tela nova fica sem
// como ser preenchida.
test("o e-mail de confirmacao entrega o codigo", () => {
  assert.match(confirmationTemplate, /\{\{ \.Token \}\}/);
  // O link continua como caminho secundário para quem abre no mesmo navegador.
  assert.match(confirmationTemplate, /\{\{ \.ConfirmationURL \}\}/);
});

test("a tela de verificacao pede o codigo e mantem o reenvio", () => {
  assert.match(loginPageSource, /verifyEmailOtpAction/);
  assert.match(loginPageSource, /autoComplete="one-time-code"/);
  assert.match(loginPageSource, /inputMode="numeric"/);
  assert.match(loginPageSource, /resendEmailVerificationAction/);
});

// auth/callback e o timeout de sessão redirecionam para cá com um parâmetro que
// antes ninguém lia: a pessoa via tela de login em branco depois de pagar.
test("o login explica falha do link e sessao expirada", () => {
  assert.match(loginPageSource, /searchParams\.get\("error"\) === "auth_callback"/);
  assert.match(loginPageSource, /searchParams\.get\("expired"\) === "session"/);
  assert.match(loginPageSource, /callbackFailed \?/);
  assert.match(loginPageSource, /sessionExpired \?/);
});

// A proposta B não mexe na configuração do Supabase: a prova de posse do e-mail
// continua acontecendo ANTES da sessão existir. Sem migration, sem coluna nova.
test("a confirmacao de e-mail continua obrigatoria no Supabase", () => {
  assert.match(supabaseConfig, /enable_confirmations = true/);
});
