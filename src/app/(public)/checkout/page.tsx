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
          <div className="animate-rise">
            <Badge tone="blue" className="mb-5">
              Pagamento único
            </Badge>
          </div>
          <h1
            className="animate-rise text-4xl font-display font-semibold tracking-tight leading-tight text-slate-950 md:text-5xl"
            style={{ "--rise-delay": "70ms" } as React.CSSProperties}
          >
            {product.product_name}
          </h1>
          <p
            className="animate-rise mt-4 max-w-2xl text-lg leading-8 text-slate-600"
            style={{ "--rise-delay": "140ms" } as React.CSSProperties}
          >
            Sua conta foi criada. Para entrar na plataforma, falta apenas
            concluir a compra.
          </p>

          <div
            className="animate-rise mt-8 grid gap-4 sm:grid-cols-3"
            style={{ "--rise-delay": "210ms" } as React.CSSProperties}
          >
            <Info icon={CreditCard} title="Sem mensalidade" text="Cobrança única, sem renovação automática." />
            <Info icon={CalendarClock} title="Acesso até 2026" text="Validade até a data do ENEM 2026." />
            <Info icon={ShieldCheck} title="Compra protegida" text="Pagamento processado em ambiente seguro, com confirmação automática." />
          </div>

          <Reveal>
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Incluído no acesso completo</CardTitle>
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
          </Reveal>

        </section>

        <aside
          className="animate-rise"
          style={{ "--rise-delay": "180ms" } as React.CSSProperties}
        >
          <Card className="sticky top-24">
            <CardContent>
              <div className="rounded-lg bg-slate-950 p-6 text-white">
                <p className="text-sm font-semibold text-blue-200">{product.product_name}</p>
                <p className="mt-3 text-5xl font-bold">{formatCurrency(price)}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Pagamento único. Sem mensalidade.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Acesso completo até o ENEM 2026.
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
                  Ao pagar, você confirma que leu os{" "}
                  <Link className="font-semibold text-blue-700" href="/termos">
                    termos
                  </Link>{" "}
                  e a{" "}
                  <Link className="font-semibold text-blue-700" href="/privacidade">
                    política de privacidade
                  </Link>
                  .
                </p>
              </div>

              <div className="mt-6">
                <CheckoutButton />
              </div>

              <div className="mt-5 grid gap-2">
                <Link href="/reembolso" className={buttonClasses({ variant: "outline", size: "md", full: true })}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Política de reembolso
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
