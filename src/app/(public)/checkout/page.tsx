import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ReceiptText,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Notice } from "@/components/ui/notice";
import { accessUntilLabel, initialCreditsLabel } from "@/components/landing/landing-data";
import { getAccessContext } from "@/lib/access";
import { formatCurrency, getCurrentProductPrice, getPublicProduct } from "@/lib/services/billing";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CheckoutButton } from "./checkout-button";

const purchaseIncludes = [
  `Acesso até ${accessUntilLabel}`,
  "Sem mensalidade",
  "Sem renovação automática",
  initialCreditsLabel,
  "Banco de questões",
  "Simulados",
  "Plano semanal",
  "Análise de desempenho",
  "Correção de redação",
  "Recursos de inteligência artificial",
];

const trustItems = [
  { label: "Pagamento processado pelo Mercado Pago", icon: CreditCard },
  { label: "Sem renovação automática", icon: CheckCircle2 },
  { label: `Acesso válido até ${accessUntilLabel}`, icon: CalendarDays },
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

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#ffffff_0%,#eff7ff_100%)]">
      <section className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-[14px] px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Voltar ao site
          </Link>
        </div>

        <div className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-8 lg:py-12">
          <div className="min-w-0">
            <header className="animate-rise">
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">
                Checkout
              </span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                {pendingOrder ? "Estamos aguardando seu pagamento" : "Finalize seu acesso"}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {pendingOrder
                  ? "Já recebemos seu pedido. Pagamentos em Pix costumam ser confirmados em minutos. Boleto pode levar até 3 dias úteis. Seu acesso é liberado automaticamente na confirmação."
                  : "Confira os dados e escolha a forma de pagamento para continuar."}
              </p>
            </header>

            {pendingOrder ? (
              <Notice
                tone="info"
                icon={Clock}
                className="animate-rise mt-6 max-w-2xl rounded-[20px] border-blue-100 bg-white"
                title="Pedido em análise"
              >
                <p className="leading-6">
                  Não precisa pagar de novo. Se você já concluiu o pagamento,
                  use o botão abaixo para conferir agora.
                </p>
                <a
                  href={`/pagamento/sucesso?order=${pendingOrder.id}`}
                  className={buttonClasses({
                    variant: "primary",
                    size: "sm",
                    className: "mt-3 rounded-[14px]",
                  })}
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

            <div
              className="animate-rise mt-6 rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-900/5 sm:p-7"
              style={{ "--rise-delay": "80ms" } as React.CSSProperties}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-blue-50 text-blue-700">
                  <ReceiptText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-950">
                    {pendingOrder ? "Acompanhe seu pedido" : "Pagamento"}
                  </h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                    {pendingOrder
                      ? "Você pode verificar o status ou continuar pelo fluxo do checkout se precisar."
                      : "O próximo passo acontece no ambiente do Mercado Pago."}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <CheckoutButton
                  disabled={!product.launch_ready}
                  disabledMessage="As vendas estão fechadas neste momento. Escreva para suporte@pontuaenem.com.br e avisamos você quando reabrirem."
                />
              </div>

              <ul className="mt-6 grid gap-3 border-t border-blue-100 pt-5 sm:grid-cols-3">
                {trustItems.map(({ label, icon: Icon }) => (
                  <li key={label} className="flex items-start gap-2.5 text-sm font-bold leading-6 text-slate-600">
                    <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-700" aria-hidden="true" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside
            className="animate-rise"
            style={{ "--rise-delay": "140ms" } as React.CSSProperties}
          >
            <div className="rounded-[28px] border border-blue-100 bg-[#f8fbff] p-4 shadow-sm shadow-blue-900/5 lg:sticky lg:top-24">
              <div className="rounded-[24px] bg-white p-6 shadow-sm shadow-blue-900/5">
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">
                  Pagamento único
                </span>
                <h2 className="mt-4 text-2xl font-extrabold text-slate-950">
                  {product.product_name}
                </h2>
                <div className="mt-4">
                  <p className="tnum text-5xl font-extrabold leading-none text-blue-700">
                    {formatCurrency(price)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Pagamento único
                  </p>
                </div>

                <dl className="mt-6 grid gap-3 rounded-[18px] bg-blue-50/70 p-4 text-sm">
                  <SummaryRow label="Conta" value={user.email ?? "aluno Pontua Enem"} />
                  <SummaryRow label="Acesso" value={`Até ${accessUntilLabel}`} />
                  <SummaryRow label="Renovação" value="Não automática" />
                </dl>

                <div className="mt-6">
                  <p className="text-sm font-extrabold text-slate-950">
                    Incluído no acesso
                  </p>
                  <ul className="mt-4 grid gap-3">
                    {purchaseIncludes.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Check
                          className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue-700"
                          aria-hidden="true"
                        />
                        <span className="text-sm font-bold leading-6 text-slate-700">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-5 rounded-[18px] bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-600">
                  Recargas adicionais são opcionais. O custo aparece antes da
                  confirmação de cada recurso.
                </p>
              </div>
            </div>

            <p className="mt-4 text-center text-xs font-medium leading-5 text-slate-500">
              Dúvidas sobre a compra? Fale com{" "}
              <a
                href="mailto:suporte@pontuaenem.com.br"
                className="font-bold underline underline-offset-2 hover:text-slate-700"
              >
                suporte@pontuaenem.com.br
              </a>
              .
            </p>
          </aside>
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
