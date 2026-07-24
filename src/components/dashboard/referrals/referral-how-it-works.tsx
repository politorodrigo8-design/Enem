const steps = [
  "Compartilhe seu link.",
  "Seu amigo cria uma nova conta e compra o Pontua ENEM.",
  "Ele recebe 20 créditos extras e você recebe 30 créditos.",
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
      <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
        Os créditos da indicação são liberados apenas para compras válidas e podem ser
        cancelados em caso de reembolso, fraude ou violação das regras do programa.
      </p>
    </div>
  );
}
