export function InsufficientPerformanceData() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <h3 className="text-base font-bold text-amber-950">Ainda precisamos de mais respostas</h3>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Responda mais algumas questões para receber uma análise de desempenho mais precisa.
      </p>
      <a
        href="/dashboard/praticar?tab=banco"
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
      >
        Continuar praticando
      </a>
    </div>
  );
}
