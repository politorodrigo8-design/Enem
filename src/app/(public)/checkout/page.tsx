import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  Check,
  CreditCard,
  Gauge,
  LockKeyhole,
  NotebookTabs,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Reveal } from "@/components/ui/reveal";
import { getAccessContext } from "@/lib/access";
import { formatCurrency, getCurrentProductPrice, getPublicProduct } from "@/lib/services/billing";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CheckoutButton } from "./checkout-button";

const included = [
  "Radar ENEM",
  "Banco de questões",
  "Questões com fonte identificada e revisão editorial",
  "Treino de alta prioridade",
  "Diagnóstico personalizado",
  "Simulados",
  "Plano semanal",
  "Painel de desempenho",
  "Revisão de erros",
  "Atualizações até a prova",
];

const highlights = [
  {
    icon: Target,
    title: "Prioridade clara",
    text: "Saiba quais assuntos merecem estudo primeiro, sem depender de chute.",
  },
  {
    icon: NotebookTabs,
    title: "Treino organizado",
    text: "Questões, revisão de erros, simulados e plano semanal no mesmo lugar.",
  },
  {
    icon: ShieldCheck,
    title: "Pagamento seguro",
    text: "Compra única processada pelo provedor de pagamento, sem renovação automática.",
  },
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
  const accessValidUntil = new Date(product.access_valid_until).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="bg-paper">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div className="self-center">
            <div className="animate-rise flex flex-wrap items-center gap-3">
              <Badge tone="blue">Pagamento único</Badge>
              <span className="text-sm font-semibold text-slate-500">Sem mensalidade</span>
            </div>

            <h1
              className="animate-rise mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl"
              style={{ "--rise-delay": "70ms" } as React.CSSProperties}
            >
              Finalize seu acesso ao <span className="highlight">{product.product_name}</span>
            </h1>

            <p
              className="animate-rise mt-5 max-w-2xl text-lg leading-8 text-slate-600"
              style={{ "--rise-delay": "140ms" } as React.CSSProperties}
            >
              Sua conta já está pronta. Falta apenas confirmar a compra para liberar
              o painel, o treino prioritário, os simulados e o plano de estudos até
              o ENEM 2026.
            </p>

            <div
              className="animate-rise mt-8 grid gap-3 sm:grid-cols-3"
              style={{ "--rise-delay": "210ms" } as React.CSSProperties}
            >
              <ProofPoint icon={CreditCard} label="Compra única" value={formatCurrency(price)} />
              <ProofPoint icon={CalendarClock} label="Acesso válido até" value={accessValidUntil} />
              <ProofPoint icon={LockKeyhole} label="Conta" value={user.email ?? "aluno Pontua Enem"} />
            </div>
          </div>

          <aside
            className="animate-rise lg:row-span-2"
            style={{ "--rise-delay": "180ms" } as React.CSSProperties}
          >
            <Card className="sticky top-24 overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-slate-950 p-6 text-white">
                  <Logo variant="dark" className="mb-8" />
                  <p className="text-sm font-semibold text-blue-200">{product.product_name}</p>
                  <div className="mt-3 flex items-end gap-2">
                    <p className="tnum text-5xl font-bold leading-none">{formatCurrency(price)}</p>
                    <p className="pb-1 text-sm font-semibold text-slate-300">à vista</p>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    Um pagamento para usar todos os recursos até a prova, sem
                    cobrança recorrente.
                  </p>
                </div>

                <div className="p-5">
                  <div className="grid gap-3 border-b border-slate-200 pb-5 text-sm text-slate-700">
                    <SummaryRow label="Produto" value={product.product_name} />
                    <SummaryRow label="Validade" value={accessValidUntil} />
                    <SummaryRow label="Renovação" value="Não automática" />
                  </div>

                  <div className="mt-5">
                    <CheckoutButton
                      disabled={!product.launch_ready}
                      disabledMessage="O pagamento está temporariamente indisponível. Tente novamente em alguns minutos."
                    />
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Ao pagar, você confirma que leu os{" "}
                    <Link className="font-semibold text-blue-700 hover:text-blue-800" href="/termos">
                      termos, incluindo as regras de reembolso
                    </Link>{" "}
                    e a{" "}
                    <Link className="font-semibold text-blue-700 hover:text-blue-800" href="/privacidade">
                      política de privacidade
                    </Link>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>

          <Reveal>
            <div className="grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => (
                <Info key={item.title} {...item} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div>
              <Badge tone="slate">Acesso completo</Badge>
              <h2 className="mt-4 font-display text-3xl font-semibold text-slate-950">
                O que entra na sua área de estudos
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Recursos pensados para transformar o diagnóstico em treino prático,
                revisão e acompanhamento de evolução.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Incluído no acesso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
        </Reveal>
      </section>
    </main>
  );
}

function Info({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Target;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
      <p className="mt-4 text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function ProofPoint({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
      <p className="mt-3 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-950">{value}</p>
    </div>
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
