import {
  REFERRAL_REFERRED_BONUS_CREDITS,
  REFERRAL_REFERRER_REWARD_CREDITS,
  REFERRAL_REWARD_HOLD_DAYS,
  referralProgramCopy,
} from "@/lib/referrals/constants";

const steps = [
  "Envie seu link para quem ainda não usa o Pontua ENEM.",
  "Seu amigo cria a conta pelo link e compra o acesso à plataforma.",
  `Ele recebe ${REFERRAL_REFERRED_BONUS_CREDITS} créditos na confirmação do pagamento e você recebe ${REFERRAL_REFERRER_REWARD_CREDITS} em ${REFERRAL_REWARD_HOLD_DAYS} dias.`,
];

export function ReferralHowItWorks() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-950">Como funciona</p>
      <ol className="mt-3 grid gap-3 text-sm leading-6 text-slate-600 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
        <p>{referralProgramCopy.purchaseCondition}</p>
        <p>{referralProgramCopy.linkNotice}</p>
        <p>{referralProgramCopy.terms}</p>
      </div>
    </div>
  );
}
