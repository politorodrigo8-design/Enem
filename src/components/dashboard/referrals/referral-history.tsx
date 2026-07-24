import { Badge } from "@/components/ui/badge";
import type { ReferralHistoryItem } from "@/lib/db/types";
import { formatAppDateTime } from "@/lib/dates";
import { referralStatusLabels, referralStatusTones } from "@/lib/referrals/constants";

type BadgeTone = "blue" | "green" | "red" | "slate" | "amber";

export function ReferralHistory({ items }: { items: ReferralHistoryItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
        Nenhuma indicação registrada ainda.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li
          key={item.id}
          className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {item.referredName}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{formatReferralDate(item.date)}</p>
            {item.statusReason ? (
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.statusReason}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge tone={referralStatusTones[item.status] as BadgeTone}>
              {referralStatusLabels[item.status]}
            </Badge>
            <span className="tnum text-sm font-bold text-slate-700">{item.rewardLabel}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatReferralDate(value: string) {
  return formatAppDateTime(value, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
