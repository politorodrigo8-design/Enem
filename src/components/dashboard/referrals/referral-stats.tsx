import { Award, Clock, Coins, Users } from "lucide-react";
import type { ReferralDashboardData } from "@/lib/db/types";
import { REFERRAL_REWARD_HOLD_DAYS } from "@/lib/referrals/constants";

const items = [
  {
    key: "convertedInvites",
    label: "Amigos que compraram",
    icon: Users,
    hint: null,
  },
  {
    key: "pendingRewards",
    label: "Créditos a caminho",
    icon: Clock,
    hint: `Liberados em até ${REFERRAL_REWARD_HOLD_DAYS} dias`,
  },
  {
    key: "confirmedRewards",
    label: "Indicações pagas",
    icon: Award,
    hint: null,
  },
  {
    key: "totalCreditsEarned",
    label: "Créditos ganhos",
    icon: Coins,
    hint: null,
  },
] as const;

export function ReferralStats({ data }: { data: ReferralDashboardData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <Icon className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
            </div>
            <p className="tnum mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {data[item.key]}
            </p>
            {item.hint ? (
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.hint}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
