import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  Check,
  CreditCard,
  FileText,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { getAccessContext } from "@/lib/access";
import { formatCurrency, getCurrentProductPrice, getPublicProduct } from "@/lib/services/billing";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CheckoutButton } from "./checkout-button";

const included = [
  "Radar ENEM",
  "Banco de questoes",
  "Questoes antigas priorizadas quando revisadas",
  "Treino de alta prioridade",
  "Diagnostico personalizado",
  "Simulados",
  "Plano semanal",
  "Painel de desempenho",
  "Revisao de erros",
  "Atualizacoes ate a prova",
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

  return (
    <main className="bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <section>
          <Badge tone="blue" className="mb-5">
            Pagamento unico
          </Badge>
          <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
            {product.product_name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            A conta foi criada. Para entrar na plataforma, conclua a compra ou
            aguarde uma liberacao administrativa.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Info icon={CreditCard} title="Sem mensalidade" text="Cobranca unica, sem renovacao automatica." />
            <Info icon={CalendarClock} title="Acesso ate 2026" text="Validade conforme data do produto ativo." />
            <Info icon={ShieldCheck} title="Servidor valida" text="Preco e acesso nao sao definidos no cliente." />
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Incluido no acesso completo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {included.map((item) => (
                  <div key={item} className="flex gap-3">
                    <Check className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
                    <span className="text-sm font-semibold leading-6 text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Notice tone="warning" className="mt-6">
            Enquanto `launch_ready` estiver falso, o checkout real permanece
            desativado para evitar cobranca antes de conteudo, gateway, termos e
            testes estarem prontos.
          </Notice>
        </section>

        <aside>
          <Card className="sticky top-24">
            <CardContent>
              <div className="rounded-lg bg-slate-950 p-6 text-white">
                <p className="text-sm font-semibold text-blue-200">{product.product_name}</p>
                <p className="mt-3 text-5xl font-bold">{formatCurrency(price)}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Pagamento unico. Sem mensalidade.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Acesso completo ate o ENEM 2026.
                </p>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <p>
                  <strong>Conta:</strong> {user.email}
                </p>
                <p>
                  <strong>Validade:</strong>{" "}
                  {new Date(product.access_valid_until).toLocaleDateString("pt-BR")}
                </p>
                <p>
                  Ao pagar, voce confirma que leu os{" "}
                  <Link className="font-semibold text-blue-700" href="/termos">
                    termos
                  </Link>{" "}
                  e a{" "}
                  <Link className="font-semibold text-blue-700" href="/privacidade">
                    politica de privacidade
                  </Link>
                  .
                </p>
              </div>

              <div className="mt-6">
                <CheckoutButton disabled={!product.launch_ready} />
              </div>

              <div className="mt-5 grid gap-2">
                <Link href="/reembolso" className={buttonClasses({ variant: "outline", size: "md", full: true })}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Politica de reembolso
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function Info({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Radar;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent>
        <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-slate-950">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      </CardContent>
    </Card>
  );
}
