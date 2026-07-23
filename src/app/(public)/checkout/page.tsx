import { redirect } from "next/navigation";
import { Check, LogOut } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { getAccessContext } from "@/lib/access";
import { signOutAction } from "@/lib/actions/auth";
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

  if (!user) redirect("/login?redirectedFrom=/checkout");

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
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div
            className="animate-rise self-center"
            style={{ "--rise-delay": "70ms" } as React.CSSProperties}
          >
            <Card>
              <CardHeader>
                <CardTitle>O que está incluído</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {included.map((item) => (
                    <div key={item} className="flex gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span className="text-sm font-semibold leading-6 text-slate-700">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside
            className="animate-rise"
            style={{ "--rise-delay": "180ms" } as React.CSSProperties}
          >
            <Card className="sticky top-24 overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-slate-950 p-6 text-white">
                  <Logo variant="dark" className="[&_img]:h-7" />
                  <p className="mt-5 text-sm font-semibold text-blue-200">{product.product_name}</p>
                  <div className="mt-3 flex items-end gap-2">
                    <p className="tnum text-5xl font-bold leading-none">{formatCurrency(price)}</p>
                    <p className="pb-1 text-sm font-semibold text-slate-300">à vista</p>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-3 border-b border-slate-200 pb-5 text-sm text-slate-700">
                    <SummaryRow label="Validade" value={accessValidUntil} />
                    <SummaryRow label="Renovação" value="Não automática" />
                    <SummaryRow label="Conta" value={user.email ?? "aluno Pontua Enem"} />
                  </div>

                  <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Entrou com o e-mail errado?
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Saia desta conta para entrar com outro e-mail antes de comprar.
                    </p>
                    <form action={signOutAction} className="mt-3">
                      <button
                        type="submit"
                        className={buttonClasses({
                          variant: "outline",
                          size: "sm",
                          full: true,
                        })}
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Trocar conta
                      </button>
                    </form>
                  </div>

                  <div className="mt-5">
                    <CheckoutButton
                      disabled={!product.launch_ready}
                      disabledMessage="O pagamento está temporariamente indisponível. Tente novamente em alguns minutos."
                    />
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    O pagamento é processado pelo Mercado Pago. O acesso só é liberado após
                    confirmação financeira.
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}
