import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccessPage() {
  return (
    <PaymentStatus
      icon={CheckCircle2}
      title="Pagamento recebido"
      text="Estamos confirmando seu pagamento. Assim que a confirmação chegar — normalmente em poucos minutos — seu acesso é liberado automaticamente."
      actionHref="/dashboard"
      actionLabel="Acessar o dashboard"
    />
  );
}

function PaymentStatus({
  icon: Icon,
  title,
  text,
  actionHref,
  actionLabel,
}: {
  icon: typeof CheckCircle2;
  title: string;
  text: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <main className="bg-slate-50 py-16">
      <div className="animate-rise mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-8 sm:p-10">
            <Icon className="h-10 w-10 text-emerald-600" aria-hidden="true" />
            <h1 className="mt-5 text-3xl font-display font-semibold tracking-tight text-slate-950">{title}</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">{text}</p>
            <Link href={actionHref} className={buttonClasses({ variant: "primary", size: "lg", className: "mt-8" })}>
              {actionLabel}
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
