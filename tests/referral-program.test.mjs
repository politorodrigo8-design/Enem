import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/025_referral_program.sql", import.meta.url),
  "utf8",
);
const referralHoldMigration = readFileSync(
  new URL("../supabase/migrations/031_hold_all_referral_rewards.sql", import.meta.url),
  "utf8",
);
const middleware = readFileSync(
  new URL("../src/lib/supabase/middleware.ts", import.meta.url),
  "utf8",
);
const authAction = readFileSync(
  new URL("../src/lib/actions/auth.ts", import.meta.url),
  "utf8",
);
const referralActions = readFileSync(
  new URL("../src/lib/actions/referrals.ts", import.meta.url),
  "utf8",
);
const paymentRoute = readFileSync(
  new URL("../src/app/api/payments/create/route.ts", import.meta.url),
  "utf8",
);
const webhookRoute = readFileSync(
  new URL("../src/app/api/payments/webhook/route.ts", import.meta.url),
  "utf8",
);
const mercadoPagoProcessing = readFileSync(
  new URL("../src/lib/services/mercado-pago-processing.ts", import.meta.url),
  "utf8",
);
const constants = readFileSync(
  new URL("../src/lib/referrals/constants.ts", import.meta.url),
  "utf8",
);
const cookies = readFileSync(
  new URL("../src/lib/referrals/cookies.ts", import.meta.url),
  "utf8",
);
const queries = readFileSync(
  new URL("../src/lib/db/queries.ts", import.meta.url),
  "utf8",
);
const creditsPage = readFileSync(
  new URL("../src/app/dashboard/creditos/page.tsx", import.meta.url),
  "utf8",
);
const referralsPage = readFileSync(
  new URL("../src/app/dashboard/indicacoes/page.tsx", import.meta.url),
  "utf8",
);
const dashboardHome = readFileSync(
  new URL("../src/app/dashboard/page.tsx", import.meta.url),
  "utf8",
);
const dashboardShell = readFileSync(
  new URL("../src/components/dashboard/dashboard-shell.tsx", import.meta.url),
  "utf8",
);
const settingsClient = readFileSync(
  new URL("../src/app/dashboard/configuracoes/settings-client.tsx", import.meta.url),
  "utf8",
);
const howItWorks = readFileSync(
  new URL("../src/components/dashboard/referrals/referral-how-it-works.tsx", import.meta.url),
  "utf8",
);
const shareLink = readFileSync(
  new URL("../src/components/dashboard/referrals/referral-share-link.tsx", import.meta.url),
  "utf8",
);
const referralUi = [
  "../src/components/dashboard/referrals/referral-program-section.tsx",
  "../src/components/dashboard/referrals/referral-share-link.tsx",
  "../src/components/dashboard/referrals/referral-stats.tsx",
  "../src/components/dashboard/referrals/referral-history.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");

test("migration gera codigos legiveis e unicos para perfis", () => {
  assert.match(migration, /add column if not exists referral_code/);
  assert.match(migration, /create or replace function public\.generate_unique_referral_code/);
  assert.match(migration, /PONTUA-/);
  assert.match(migration, /profiles_referral_code_lower_unique/);
  assert.match(migration, /handle_new_user\(\)[\s\S]*public\.generate_unique_referral_code/);
});

test("codigo valido e preservado no cadastro sem trocar a primeira atribuicao", () => {
  assert.match(middleware, /resolve_referral_code/);
  assert.match(middleware, /!request\.cookies\.get\(REFERRAL_ATTRIBUTION_COOKIE_NAME\)/);
  assert.match(authAction, /attachReferralFromCurrentCookie\(data\.user\.id\)/);
  assert.match(migration, /on conflict \(referred_user_id\) do nothing/);
  assert.match(migration, /referrals_one_referrer_per_referred_unique/);
});

test("codigo invalido, usuario antigo e autoindicacao nao geram vinculo", () => {
  assert.match(cookies, /referralCodePattern/);
  assert.match(migration, /normalized_code is null or normalized_code !~ '\^\[A-Z0-9\]/);
  assert.match(migration, /referred\.created_at < now\(\) - interval '1 day'/);
  assert.match(migration, /referrals_no_self_referral_check/);
  assert.match(migration, /lower\(referrer\.email\) = lower\(referred\.email\)/);
});

test("primeira compra aprovada agenda bonus dos dois lados", () => {
  assert.match(constants, /REFERRAL_REFERRED_BONUS_CREDITS = 20/);
  assert.match(constants, /REFERRAL_REFERRER_REWARD_CREDITS = 30/);
  assert.match(migration, /'referral_referred_bonus'/);
  assert.match(migration, /referred_bonus_credits integer not null default 20/);
  assert.match(referralHoldMigration, /status = case[\s\S]*else 'pending_release'/);
  assert.match(referralHoldMigration, /reward_available_at = coalesce\(reward_available_at, now\(\) \+ interval '7 days'\)/);
  assert.doesNotMatch(referralHoldMigration, /referred_reward_granted_at = now\(\)/);
});

test("recompensas dos dois lados sao liberadas apos o prazo por rotina idempotente", () => {
  assert.match(referralHoldMigration, /create or replace function public\.process_pending_referral_rewards/);
  assert.match(referralHoldMigration, /reward_available_at <= now\(\)/);
  assert.match(referralHoldMigration, /for update skip locked/);
  assert.match(referralHoldMigration, /'referral_referred_bonus'/);
  assert.match(referralHoldMigration, /'referral_referrer_bonus'/);
  assert.match(referralHoldMigration, /referred_reward_granted_at = coalesce/);
  assert.match(referralHoldMigration, /referrer_reward_granted_at = coalesce/);
  assert.match(migration, /credit_ledger_one_referral_referrer_bonus_unique/);
  assert.match(queries, /processPendingReferralRewardsForUser\(user\.id\)/);
});

test("webhook duplicado e segunda compra nao duplicam creditos", () => {
  assert.match(webhookRoute, /processApprovedMercadoPagoPayment/);
  assert.match(mercadoPagoProcessing, /process_referral_purchase_for_order/);
  assert.match(mercadoPagoProcessing, /process_pending_referral_rewards/);
  assert.match(migration, /credit_ledger_one_referral_referred_bonus_unique/);
  assert.match(migration, /credit_ledger_one_referral_referrer_bonus_unique/);
  assert.match(migration, /o\.id <> target_order\.id[\s\S]*o\.status = 'approved'/);
  assert.match(migration, /not_first_valid_purchase/);
});

test("pagamento rejeitado nao concede bonus e reembolso reverte sem saldo negativo", () => {
  const rejectedSection = webhookRoute.slice(webhookRoute.indexOf("payment.status === \"rejected\""));
  assert.doesNotMatch(rejectedSection, /process_referral_purchase_for_order/);
  assert.match(migration, /cancel_or_reverse_referral_for_order/);
  assert.match(migration, /'referral_bonus_reversal'/);
  assert.match(migration, /reversible_credits := least\(account\.balance, target_amount\)/);
  assert.match(migration, /credit_ledger_one_referral_reversal_per_role_unique/);
});

test("RLS impede leitura cruzada e cliente nao concede creditos", () => {
  assert.match(migration, /alter table public\.referrals enable row level security/);
  assert.match(migration, /using \(referrer_user_id = auth\.uid\(\)\)/);
  assert.match(migration, /referrals_no_client_insert/);
  assert.match(migration, /with check \(false\)/);
  assert.match(migration, /revoke execute on function public\.process_pending_referral_rewards/);
  assert.match(migration, /grant execute on function public\.process_pending_referral_rewards\(uuid\) to service_role/);
});

test("checkout e Mercado Pago carregam metadados internos da indicacao", () => {
  assert.match(paymentRoute, /getCheckoutReferral/);
  assert.match(paymentRoute, /referral_id: referral\?\.id/);
  assert.match(paymentRoute, /referrer_user_id: referral\?\.referrer_user_id/);
  assert.match(paymentRoute, /referral_attributed: Boolean\(referral\)/);
});

test("UI de indicacao tem link, compartilhamento, indicadores, historico e layout responsivo", () => {
  // O programa completo mora na rota dedicada; a página de créditos leva até lá
  // com a versão curta, sem duplicar estatísticas e histórico.
  assert.match(referralsPage, /ReferralProgramSection/);
  assert.match(referralsPage, /getReferralPageData/);
  assert.match(creditsPage, /ReferralHomeCard/);
  assert.doesNotMatch(creditsPage, /ReferralProgramSection/);
  assert.ok(
    creditsPage.indexOf("Precisa de mais créditos?") < creditsPage.indexOf("<ReferralHomeCard"),
  );
  assert.ok(creditsPage.indexOf("<ReferralHomeCard") < creditsPage.indexOf("Histórico recente"));
  assert.match(referralUi, /Copiar link/);
  assert.match(referralUi, /Gerar link/);
  assert.match(referralUi, /Link de indicação/);
  assert.match(referralUi, /ensureReferralCodeAction/);
  assert.match(referralActions, /ensure_referral_code/);
  assert.match(referralActions, /revalidatePath\("\/dashboard\/creditos"\)/);
  assert.doesNotMatch(referralUi, /Atualize a página em instantes/);
  assert.match(referralUi, /navigator\.share/);
  assert.match(referralUi, /https:\/\/wa\.me/);
  assert.match(referralUi, /grid gap-3 sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(referralUi, /Histórico de indicações/);
});

test("todo aluno encontra o programa sem procurar: menu, home e perfil", () => {
  assert.match(dashboardShell, /Indique e ganhe/);
  // Rota própria, não âncora dentro de Créditos: com hash o item do menu nunca
  // ficava destacado (a marcação compara pathname, que não carrega hash).
  assert.match(dashboardShell, /href: "\/dashboard\/indicacoes"/);
  assert.doesNotMatch(dashboardShell, /#indicacoes/);
  assert.match(dashboardHome, /ReferralHomeCard/);
  assert.match(dashboardHome, /getReferralAccountSummary\(\)/);
  assert.match(settingsClient, /ReferralShareLink/);
  // O perfil não pode ter um caminho sem saída: o próprio componente de link
  // oferece "Gerar link" quando o código não veio.
  assert.doesNotMatch(settingsClient, /Link indisponível agora/);
});

test("copy da campanha sai das constantes, nunca escrita na mao", () => {
  assert.doesNotMatch(constants, /Ganhe 30 créditos/);
  assert.match(constants, /\$\{REFERRAL_REFERRER_REWARD_CREDITS\}/);
  assert.match(constants, /\$\{REFERRAL_REFERRED_BONUS_CREDITS\}/);
  assert.match(constants, /\$\{REFERRAL_REWARD_HOLD_DAYS\} dias/);
  assert.match(constants, /referralRewardInEssayCorrections/);
  assert.doesNotMatch(settingsClient, /Ganhe 30 créditos/);
  assert.match(howItWorks, /REFERRAL_REWARD_HOLD_DAYS/);
});

test("ganho dos dois lados, carencia e condicao de compra ficam na primeira tela", () => {
  assert.match(referralUi, /Você ganha/);
  assert.match(referralUi, /Seu amigo ganha/);
  assert.match(referralUi, /referralProgramCopy\.holdNotice/);
  assert.match(referralUi, /referralProgramCopy\.purchaseCondition/);
  // Crédito só significa algo traduzido em uso: 30 créditos = 3 correções.
  assert.match(referralUi, /ESSAY_CREDIT_COST/);
  assert.match(referralUi, /correções.*de redação|de redação/);
});

test("copia do link sobrevive a mobile sem clipboard e informa falha", () => {
  assert.match(shareLink, /navigator\.clipboard\?\.writeText/);
  assert.match(shareLink, /document\.execCommand\("copy"\)/);
  assert.match(shareLink, /tone: "error"/);
  assert.match(shareLink, /Selecione o link acima e copie/);
  assert.match(shareLink, /AbortError/);
  assert.match(shareLink, /aria-live="polite"/);
});

test("estado vazio do historico convida a indicar", () => {
  assert.doesNotMatch(referralUi, /Nenhuma indicação registrada ainda/);
  assert.match(referralUi, /Você ainda não indicou ninguém/);
  assert.match(referralUi, /REFERRAL_REFERRED_BONUS_CREDITS/);
});
