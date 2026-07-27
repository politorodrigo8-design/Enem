"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type MercadoPagoReturnParams = {
  payment_id: string | null;
  collection_id: string | null;
  collection_status: string | null;
  status: string | null;
  external_reference: string | null;
  merchant_order_id: string | null;
  preference_id: string | null;
};

type ReconciliationState = "checking" | "pending" | "approved" | "rejected" | "error";

const autoCheckLimit = 5;
const retryDelayMs = 3000;

export function PaymentSuccessReconciliation({
  initialParams,
}: {
  initialParams: MercadoPagoReturnParams;
}) {
  const router = useRouter();
  const [state, setState] = useState<ReconciliationState>("checking");
  const [message, setMessage] = useState("Confirmando pagamento");
  const [attempts, setAttempts] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  const reconcile = useCallback(async () => {
    setAttempts((current) => current + 1);
    setState((current) => (current === "approved" ? current : "checking"));
    setMessage("Confirmando pagamento");

    try {
      const response = await fetch("/api/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialParams),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        status?: string;
        message?: string;
        redirectTo?: string;
      };

      if (response.ok && payload.status === "approved") {
        setState("approved");
        setMessage("Pagamento aprovado. Liberando seu acesso...");
        window.setTimeout(() => router.replace(payload.redirectTo ?? "/dashboard"), 700);
        return;
      }

      if (response.ok && payload.status === "pending") {
        setState("pending");
        setMessage(payload.message ?? "Confirmando pagamento");
        return;
      }

      setState(response.status === 403 ? "rejected" : "error");
      setMessage(payload.message ?? "Nao foi possivel confirmar o pagamento agora.");
    } catch {
      setState("error");
      setMessage("Nao foi possivel confirmar o pagamento agora.");
    }
  }, [initialParams, router]);

  useEffect(() => {
    timeoutRef.current = window.setTimeout(() => {
      void reconcile();
    }, 0);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [reconcile]);

  useEffect(() => {
    if (state !== "pending" || attempts >= autoCheckLimit) return;

    timeoutRef.current = window.setTimeout(() => {
      void reconcile();
    }, retryDelayMs);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [attempts, reconcile, state]);

  const Icon = state === "approved" ? CheckCircle2 : state === "rejected" || state === "error" ? AlertTriangle : Loader2;

  return (
    <main className="bg-slate-50 py-16">
      <div className="animate-rise mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-8 sm:p-10">
            <Icon
              className={
                state === "approved"
                  ? "h-10 w-10 text-emerald-600"
                  : state === "rejected" || state === "error"
                    ? "h-10 w-10 text-amber-600"
                    : "h-10 w-10 animate-spin text-blue-700"
              }
              aria-hidden="true"
            />
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-slate-950">
              {state === "approved" ? "Pagamento confirmado" : "Confirmando pagamento"}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">{message}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {state === "approved" ? (
                <Link href="/dashboard" className={buttonClasses({ variant: "primary", size: "lg" })}>
                  Acessar dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <Button type="button" size="lg" onClick={() => void reconcile()}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Verificar novamente
                </Button>
              )}
              <Link href="/dashboard" className={buttonClasses({ variant: "outline", size: "lg" })}>
                Ir para o dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
