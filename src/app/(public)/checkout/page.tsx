import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAccessContext } from "@/lib/access";
import { formatAppDateTime } from "@/lib/dates";
import { formatCurrency, getCurrentProductPrice, getPublicProduct } from "@/lib/services/billing";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CheckoutButton } from "./checkout-button";

const included = [
  "Radar ENEM",
  "Banco revisado de questões",
  "Treino de alta prioridade",
  "Diagnóstico personalizado",
  "Simulados",
  "Plano semanal",
  "Revisão de erros",
  "Painel de desempenho",
  "Correção de redação com uso de créditos, conforme as regras da conta",
];

export default async function CheckoutPage() {
  if (!isSupabaseConfigured()) redirect("/login?setup=supabase");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?mode=signup&redirectedFrom=/checkout");

  const [{ data: profile }, product] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    getPublicProduct(),
  ]);
  const access = getAccessContext(profile);

  if (access.hasPlatformAccess) redirect("/dashboard");

  const price = getCurrentProductPrice(product);
  const accessValidUntil = formatAppDateTime(product.access_valid_until, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="bg-paper">
      <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="animate-rise">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Pagamento seguro
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-slate-950">
            Revise e confirme sua compra
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Você paga no ambiente do Mercado Pago e o acesso é liberado assim que o
            pagamento for confirmado.
          </p>
        </header>

        <div
          className="animate-rise mt-8"
          style={{ "--rise-delay": "120ms" } as React.CSSProperties}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-slate-950 p-6 text-white sm:p-7">
                <p className="text-sm font-semibold text-blue-200">{product.product_name}</p>
                <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <p className="tnum text-5xl font-bold leading-none">{formatCurrency(price)}</p>
                  <p className="pb-1 text-sm font-semibold text-slate-300">
                    pagamento único, sem renovação automática
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <dl className="grid gap-3 text-sm">
                  <SummaryRow label="Conta" value={user.email ?? "aluno Pontua Enem"} />
                  <SummaryRow label="Acesso até" value={accessValidUntil} />
                  <SummaryRow label="Renovação" value="Não automática" />
                </dl>

                <div className="mt-6 border-t border-slate-200 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    O que está incluído
                  </p>
                  <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                    {included.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Check
                          className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                        <span className="text-sm leading-6 text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-6">
                  <CheckoutButton
                    disabled={!product.launch_ready}
                    disabledMessage="O pagamento está temporariamente indisponível. Tente novamente em alguns minutos."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p
          className="animate-rise mt-5 text-center text-xs leading-5 text-slate-500"
          style={{ "--rise-delay": "200ms" } as React.CSSProperties}
        >
          Dúvidas sobre a compra? Fale com{" "}
          <a
            href="mailto:suporte@pontuaenem.com.br"
            className="font-medium underline underline-offset-2 hover:text-slate-700"
          >
            suporte@pontuaenem.com.br
          </a>
          .
        </p>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
