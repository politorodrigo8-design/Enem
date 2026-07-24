export const REFERRAL_REFERRER_REWARD_CREDITS = 30;
export const REFERRAL_REFERRED_BONUS_CREDITS = 20;
export const REFERRAL_REWARD_HOLD_DAYS = 7;
export const REFERRAL_ATTRIBUTION_COOKIE_DAYS = 30;
export const REFERRAL_ATTRIBUTION_COOKIE_NAME = "pontua_referral_code";
export const REFERRAL_CAMPAIGN_SLUG = "indique-e-ganhe-2026";

export const referralProgramCopy = {
  title: "Indique e ganhe",
  shortDescription:
    "Ganhe 30 créditos quando um amigo assinar o Pontua ENEM. Ele também recebe 20 créditos extras.",
  dashboardDescription:
    "Ganhe 30 créditos quando um amigo assinar. Ele também recebe 20 créditos extras.",
};

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
