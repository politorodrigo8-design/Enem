import Link from "next/link";
import { ArrowRight, Clock3, Gift, Ticket, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReferralDashboardData } from "@/lib/db/types";
import {
  REFERRAL_REFERRED_BONUS_CREDITS,
  REFERRAL_REFERRER_REWARD_CREDITS,
  referralProgramCopy,
} from "@/lib/referrals/constants";
import { ReferralHistory } from "./referral-history";
import { ReferralHowItWorks } from "./referral-how-it-works";
import { ReferralShareLink } from "./referral-share-link";
import { ReferralStats } from "./referral-stats";

export function ReferralProgramSection({
  data,
  siteUrl,
}: {
  data: ReferralDashboardData;
  siteUrl: string;
}) {
  return (
    <section id="indicacoes" className="mt-10 scroll-mt-24">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Gift className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <CardTitle>{referralProgramCopy.title}</CardTitle>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {referralProgramCopy.dashboardDescription}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 lg:shrink-0 lg:self-auto">
              <Ticket className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
              <span>{data.referralCode ? "Link pronto para copiar" : "Link indisponível"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ReferralRewardHighlights />
          <ReferralShareLink referralCode={data.referralCode} siteUrl={siteUrl} />
          <ReferralStats data={data} />
          <ReferralHowItWorks />
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-950">Histórico de indicações</h3>
            </div>
            <ReferralHistory items={data.history} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/**
 * Bloco de divulgação na home: o aluno recebe o link e o ganho dos dois lados
 * sem precisar procurar. O histórico e as estatísticas continuam em Créditos.
 */
export function ReferralHomeCard({
  referralCode,
  siteUrl,
}: {
  referralCode: string;
  siteUrl: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-slate-950">
              {referralProgramCopy.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {referralProgramCopy.dashboardDescription}
            </p>
          </div>
        </div>

        <ReferralRewardHighlights />
        <ReferralShareLink referralCode={referralCode} siteUrl={siteUrl} />

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            {referralProgramCopy.purchaseCondition}
          </p>
          <Link
            href="/dashboard/indicacoes"
            className={buttonClasses({
              variant: "outline",
              size: "sm",
              className: "shrink-0 self-start sm:self-auto",
            })}
          >
            Ver minhas indicações
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReferralRewardHighlights() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <RewardBox
          icon={Gift}
          label="Você ganha"
          credits={REFERRAL_REFERRER_REWARD_CREDITS}
        />
        <RewardBox
          icon={UserPlus}
          label="Seu amigo ganha"
          credits={REFERRAL_REFERRED_BONUS_CREDITS}
        />
      </div>
      <p className="flex items-start gap-2 text-sm leading-6 text-slate-600">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <span>{referralProgramCopy.holdNotice}</span>
      </p>
    </div>
  );
}

function RewardBox({
  icon: Icon,
  label,
  credits,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  credits: number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <Icon className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
      </div>
      <p className="tnum mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {credits}
        <span className="ml-1.5 text-sm font-semibold text-slate-500">créditos</span>
      </p>
      {detail ? <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p> : null}
    </div>
  );
}
