export function AiMetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="tnum mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
