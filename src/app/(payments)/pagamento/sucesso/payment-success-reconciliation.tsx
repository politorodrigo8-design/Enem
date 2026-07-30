"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, LogIn, RefreshCw } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  identifyTikTokUser,
  trackTikTokEvent,
  waitForTikTokFlush,
} from "@/lib/analytics/tiktok";

type TikTokPurchase = {
  event_id: string;
  properties: Record<string, unknown>;
};

export type BuyerIdentity = { id: string; email: string | null };

export type MercadoPagoReturnParams = {
  order: string | null;
  payment_id: string | null;
  collection_id: string | null;
  collection_status: string | null;
  status: string | null;
  external_reference: string | null;
  merchant_order_id: string | null;
  preference_id: string | null;
};

type ReconciliationState =
  | "checking"
  | "pending"
  | "approved"
  | "rejected"
  | "error"
  | "signed_out";

const autoCheckLimit = 5;
const retryDelayMs = 3000;

export function PaymentSuccessReconciliation({
  initialParams,
  buyer,
}: {
  initialParams: MercadoPagoReturnParams;
  buyer?: BuyerIdentity | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<ReconciliationState>("checking");
  const [message, setMessage] = useState("Confirmando pagamento");
  const [attempts, setAttempts] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  // A reconciliação repete enquanto o pagamento não confirma. Sem esta trava a
  // mesma compra seria reportada a cada tentativa; o TikTok deduplicaria pelo
  // event_id, mas não faz sentido gastar requisição sabendo disso.
  const reportedPurchaseRef = useRef<string | null>(null);

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
        tiktokPurchase?: TikTokPurchase | null;
      };

      if (response.ok && payload.status === "approved") {
        reportTikTokPurchase(payload.tiktokPurchase, buyer, reportedPurchaseRef);
        setState("approved");
        setMessage("Pagamento aprovado. Liberando seu acesso...");
        // O redirect para o dashboard descarregaria a página antes de o beacon
        // do Purchase sair.
        await waitForTikTokFlush();
        router.replace(payload.redirectTo ?? "/dashboard");
        return;
      }

      if (response.ok && payload.status === "pending") {
        setState("pending");
        setMessage(payload.message ?? "Confirmando pagamento");
        return;
      }

      // Voltar do app do banco costuma abrir o site sem a sessão. Sem tratar o
      // 401 aqui, a tela oferecia só "Verificar novamente" (que falha igual) e
      // "Ir para o dashboard" (que o middleware devolve para o checkout).
      if (response.status === 401) {
        setState("signed_out");
        setMessage(
          "Entre na sua conta para confirmarmos o pagamento. Seu pedido está salvo. Nada foi perdido.",
        );
        return;
      }

      setState(response.status === 403 ? "rejected" : "error");
      setMessage(payload.message ?? "Não foi possível confirmar o pagamento agora.");
    } catch {
      setState("error");
      setMessage("Não foi possível confirmar o pagamento agora.");
    }
  }, [buyer, initialParams, router]);

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

  const Icon =
    state === "approved"
      ? CheckCircle2
      : state === "rejected" || state === "error" || state === "signed_out"
        ? AlertTriangle
        : Loader2;

  // Preserva o retorno do Mercado Pago para reconciliar logo depois do login.
  const loginHref = (() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(initialParams)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return `/login?redirectedFrom=${encodeURIComponent(
      `/pagamento/sucesso${query ? `?${query}` : ""}`,
    )}`;
  })();

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#ffffff_0%,#eff7ff_100%)] py-10 sm:py-16">
      <div className="animate-rise mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Card className="rounded-[28px] border-blue-100 shadow-sm shadow-blue-900/5">
          <CardContent className="p-6 sm:p-10">
            <span
              className={
                state === "approved"
                  ? "inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-600"
                  : state === "rejected" || state === "error" || state === "signed_out"
                    ? "inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-amber-50 text-amber-600"
                    : "inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-blue-50 text-blue-700"
              }
            >
              <Icon
                className={state === "checking" || state === "pending" ? "h-7 w-7 animate-spin" : "h-7 w-7"}
                aria-hidden="true"
              />
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">
              {state === "approved"
                ? "Pagamento confirmado"
                : state === "signed_out"
                  ? "Falta entrar na sua conta"
                  : "Confirmando pagamento"}
            </h1>
            <p className="mt-4 break-words text-base leading-7 text-slate-600">{message}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {state === "approved" ? (
                <Link
                  href="/dashboard"
                  className={buttonClasses({ variant: "primary", size: "lg", className: "rounded-2xl" })}
                >
                  Acessar dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : state === "signed_out" ? (
                <Link
                  href={loginHref}
                  className={buttonClasses({ variant: "primary", size: "lg", className: "rounded-2xl" })}
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Entrar na minha conta
                </Link>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="rounded-2xl"
                  onClick={() => void reconcile()}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Verificar novamente
                </Button>
              )}
              {state === "signed_out" ? null : (
                <Link
                  href="/dashboard"
                  className={buttonClasses({ variant: "outline", size: "lg", className: "rounded-2xl" })}
                >
                  Ir para o dashboard
                </Link>
              )}
            </div>
            {state === "rejected" || state === "error" ? (
              <p className="mt-6 text-sm leading-6 text-slate-500">
                Se você já pagou e isso continuar, escreva para{" "}
                <a
                  href="mailto:pontuaenem.suporte@gmail.com"
                  className="font-medium underline underline-offset-2 hover:text-slate-700"
                >
                  pontuaenem.suporte@gmail.com
                </a>{" "}
                com a data e a forma de pagamento.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

/**
 * Cópia de navegador do Purchase. O servidor já reportou pelo Events API na
 * aprovação; aqui vale como redundância e como fonte dos sinais de browser. O
 * event_id vem do servidor justamente para as duas cópias contarem como uma
 * única conversão.
 */
function reportTikTokPurchase(
  purchase: TikTokPurchase | null | undefined,
  buyer: BuyerIdentity | null | undefined,
  reportedRef: { current: string | null },
) {
  if (!purchase?.event_id) return;
  if (reportedRef.current === purchase.event_id) return;
  reportedRef.current = purchase.event_id;

  // O identify precisa vir antes do track para o evento carregar o matching.
  identifyTikTokUser({ email: buyer?.email, externalId: buyer?.id });
  trackTikTokEvent("Purchase", purchase.properties, purchase.event_id);
}
