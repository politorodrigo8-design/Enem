import { Gift, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReferralDashboardData } from "@/lib/db/types";
import { referralProgramCopy } from "@/lib/referrals/constants";
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
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Gift className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>{referralProgramCopy.title}</CardTitle>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {referralProgramCopy.dashboardDescription}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
              <Ticket className="h-4 w-4 text-blue-700" aria-hidden="true" />
              <span className="tnum">{data.referralCode || "Código pendente"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
