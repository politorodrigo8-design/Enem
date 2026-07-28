import { redirect } from "next/navigation";
import { Check, Clock } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { getAccessContext } from "@/lib/access";
import { formatAppDateTime } from "@/lib/dates";
import { formatCurrency, getCurrentProductPrice, getPublicProduct } from "@/lib/services/billing";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CheckoutButton } from "./checkout-button";

const included = [
  "Análise de desempenho",
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

  // Quem pagou por Pix ou boleto volta para cá enquanto o Mercado Pago não
  // confirma. Sem este aviso a página repetia "Revise e confirme sua compra"
  // com o botão de pagar ativo, ou seja, pedia o pagamento de novo a quem
  // acabou de pagar.
  const { data: pendingOrderRow } = await supabase
    .from("orders")
    .select("id, created_at")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pendingOrder = pendingOrderRow ?? null;

  const price = getCurrentProductPrice(product);
  const accessValidUntil = formatAppDateTime(product.access_valid_until, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="bg-paper">
      <section className="mx-auto grid w-full max-w-6xl gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-x-16 lg:gap-y-10 lg:px-8 lg:py-16">
        <header className="animate-rise lg:col-start-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Pagamento seguro
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-slate-950">
            {pendingOrder ? "Estamos aguardando seu pagamento" : "Revise e confirme sua compra"}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
            {pendingOrder
              ? "Já recebemos seu pedido. Pagamentos em Pix costumam ser confirmados em minutos; boleto pode levar até 3 dias úteis. Seu acesso é liberado automaticamente na confirmação."
              : "Você paga no ambiente do Mercado Pago e o acesso é liberado assim que o pagamento for confirmado."}
          </p>
          {pendingOrder ? (
            <Notice tone="info" icon={Clock} className="mt-5 max-w-xl" title="Pedido em análise">
              <p className="leading-6">
                Não precisa pagar de novo. Se você já concluiu o pagamento, use o botão abaixo
                para conferir agora.
              </p>
              <a
                href={`/pagamento/sucesso?order=${pendingOrder.id}`}
                className={buttonClasses({ variant: "primary", size: "sm", className: "mt-3" })}
              >
                Verificar meu pagamento
              </a>
              <p className="mt-3 text-xs leading-5">
                Continua sem liberar depois de confirmado? Escreva para{" "}
                <a
                  href="mailto:suporte@pontuaenem.com.br"
                  className="font-semibold underline underline-offset-2"
                >
                  suporte@pontuaenem.com.br
                </a>{" "}
                com a data do pagamento.
              </p>
            </Notice>
          ) : null}
        </header>

        <aside
          className="animate-rise lg:col-start-2 lg:row-start-1 lg:row-span-2"
          style={{ "--rise-delay": "140ms" } as React.CSSProperties}
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 lg:sticky lg:top-24">
            <div className="bg-slate-950 p-6 text-white">
              <p className="text-sm font-semibold text-blue-200">{product.product_name}</p>
              <div className="mt-3 flex flex-wrap items-end gap-x-2.5 gap-y-1">
                <p className="tnum text-5xl font-bold leading-none">{formatCurrency(price)}</p>
                <p className="pb-1 text-sm font-semibold leading-5 text-slate-300">
                  pagamento único
                </p>
              </div>
            </div>

            <div className="p-6">
              <dl className="grid gap-3 text-sm">
                <SummaryRow label="Conta" value={user.email ?? "aluno Pontua Enem"} />
                <SummaryRow label="Acesso até" value={accessValidUntil} />
                <SummaryRow label="Renovação" value="Não automática" />
              </dl>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <CheckoutButton
                  disabled={!product.launch_ready}
                  disabledMessage="As vendas estão fechadas neste momento. Escreva para suporte@pontuaenem.com.br e avisamos você quando reabrirem."
                />
              </div>
            </div>
          </div>

          <p
            className="mt-4 text-center text-xs leading-5 text-slate-500"
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
        </aside>

        <div
          className="animate-rise lg:col-start-1"
          style={{ "--rise-delay": "80ms" } as React.CSSProperties}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            O que está incluído
          </p>
          <ul className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
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
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
