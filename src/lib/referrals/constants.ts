export const REFERRAL_REFERRER_REWARD_CREDITS = 30;
export const REFERRAL_REFERRED_BONUS_CREDITS = 20;
export const REFERRAL_REWARD_HOLD_DAYS = 7;
export const REFERRAL_ATTRIBUTION_COOKIE_DAYS = 30;
export const REFERRAL_ATTRIBUTION_COOKIE_NAME = "pontua_referral_code";
export const REFERRAL_CAMPAIGN_SLUG = "indique-e-ganhe-2026";

// Todo texto da campanha nasce das constantes acima: se a recompensa mudar, a
// interface muda junto e nenhum número fica desatualizado na tela.
export const referralProgramCopy = {
  title: "Indique e ganhe",
  dashboardDescription: `Seu amigo ganha ${REFERRAL_REFERRED_BONUS_CREDITS} créditos extras e você ganha ${REFERRAL_REFERRER_REWARD_CREDITS} quando ele compra o acesso.`,
  purchaseCondition:
    "Vale para amigo com conta nova, criada pelo seu link, na primeira compra do acesso à plataforma. Cadastro sem compra não gera crédito.",
  holdNotice: `Seus ${REFERRAL_REFERRER_REWARD_CREDITS} créditos entram na conta ${REFERRAL_REWARD_HOLD_DAYS} dias depois de a compra do seu amigo ser confirmada.`,
  friendNotice: `Caem na conta dele assim que o pagamento da compra é confirmado.`,
  linkNotice: `Seu link vale por ${REFERRAL_ATTRIBUTION_COOKIE_DAYS} dias: se o amigo abrir hoje e comprar depois, a indicação continua sua.`,
  terms:
    "Os créditos valem para compras válidas e podem ser cancelados em caso de reembolso, fraude ou violação das regras do programa.",
};

/**
 * Mensagem enviada AO amigo — voz do aluno convidando, não do produto se
 * anunciando. O bônus dele também depende da compra: dizer que "já começa com
 * créditos" seria promessa que o programa não cumpre no cadastro.
 */
export function buildReferralInviteMessage(referralUrl: string) {
  return `Estou usando o Pontua ENEM para treinar para o ENEM e recomendo. Criando sua conta pelo meu link, você ganha ${REFERRAL_REFERRED_BONUS_CREDITS} créditos extras quando comprar o acesso. Meu link: ${referralUrl}`;
}

/**
 * Crédito solto não diz nada ao aluno: 30 créditos são 3 correções de redação.
 * O custo da correção vem de quem chama para não duplicar a regra de preço.
 */
export function referralRewardInEssayCorrections(essayCreditCost: number) {
  if (!Number.isFinite(essayCreditCost) || essayCreditCost <= 0) return 0;
  return Math.floor(REFERRAL_REFERRER_REWARD_CREDITS / essayCreditCost);
}

export const referralStatusLabels = {
  registered: "Cadastro realizado",
  awaiting_purchase: "Aguardando compra",
  payment_confirmed: "Pagamento confirmado",
  pending_release: "Aguardando liberação",
  reward_granted: "Créditos recebidos",
  cancelled: "Cancelada",
  refunded: "Reembolso realizado",
  blocked: "Cancelada",
} as const;

export const referralStatusTones = {
  registered: "blue",
  awaiting_purchase: "amber",
  payment_confirmed: "blue",
  pending_release: "amber",
  reward_granted: "green",
  cancelled: "red",
  refunded: "red",
  blocked: "red",
} as const;

export type ReferralStatus = keyof typeof referralStatusLabels;
