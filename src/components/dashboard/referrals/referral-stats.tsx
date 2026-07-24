import { Award, Clock, Coins, Users } from "lucide-react";
import type { ReferralDashboardData } from "@/lib/db/types";

const items = [
  {
    key: "convertedInvites",
    label: "Convites convertidos",
    icon: Users,
  },
  {
    key: "pendingRewards",
    label: "Recompensas pendentes",
    icon: Clock,
  },
  {
    key: "confirmedRewards",
    label: "Recompensas confirmadas",
    icon: Award,
  },
  {
    key: "totalCreditsEarned",
    label: "Créditos ganhos",
    icon: Coins,
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
              <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
            </div>
            <p className="tnum mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {data[item.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
