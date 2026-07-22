export function AiBalanceAfterUse({ label, value }: { label: string; value: number | null }) {
  if (typeof value !== "number") return null;
  return <p className="mt-5 text-xs font-semibold text-slate-500">{label}: {value} créditos</p>;
}
