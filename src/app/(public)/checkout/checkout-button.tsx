"use client";

import Link from "next/link";
import { Loader2, LockKeyhole } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ctaClasses } from "@/components/ui/cta";
import { identifyTikTokUser, trackTikTokEvent } from "@/lib/analytics/tiktok";
import { currentLegalAcceptanceVersions } from "@/lib/legal/config";

export function CheckoutButton({
  disabled = false,
  disabledMessage,
  productSlug,
  productName,
  amountCents,
  buyerEmail,
  buyerId,
}: {
  disabled?: boolean;
  disabledMessage?: string;
  productSlug: string;
  productName: string;
  amountCents: number;
  buyerEmail: string | null;
  buyerId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const isDisabled = disabled || pending;

  function startCheckout() {
    if (disabled) return;

    // Disparado no clique, antes da chamada ao servidor: "iniciou o checkout" já
    // é verdade aqui, e a ida ao Mercado Pago logo depois é uma troca de página
    // que mataria um beacon disparado no último instante. O identify vem antes do
    // track porque é o que carrega o Advanced Matching no evento.
    identifyTikTokUser({ email: buyerEmail, externalId: buyerId });
    trackTikTokEvent("InitiateCheckout", {
      content_type: "product",
      content_id: productSlug,
      content_name: productName,
      currency: "BRL",
      value: Math.round(amountCents) / 100,
    });

    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalAcceptance: currentLegalAcceptanceVersions(),
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        const nextMessage = payload.message ?? "Não foi possível iniciar o pagamento.";
        setMessage(nextMessage);
        toast.error(nextMessage);
        return;
      }

      if (payload.redirectTo) {
        window.location.href = payload.redirectTo;
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={isDisabled}
        onClick={startCheckout}
        aria-describedby={message || (disabled && disabledMessage) ? "checkout-payment-message" : undefined}
        className={ctaClasses({ full: true })}
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
        {disabled ? "Pagamento indisponível" : "Continuar para o pagamento"}
      </button>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
        Ao continuar você confirma os{" "}
        <CheckoutLegalLink href="/termos">Termos de Uso</CheckoutLegalLink> e a{" "}
        <CheckoutLegalLink href="/reembolso">Política de Reembolso</CheckoutLegalLink>{" "}
        aceitos na criação da conta.
      </p>
      {disabled && disabledMessage ? (
        <p
          id="checkout-payment-message"
          className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-bold leading-6 text-slate-700"
          aria-live="polite"
        >
          {disabledMessage}
        </p>
      ) : null}
      {message ? (
        <p
          id="checkout-payment-message"
          className="mt-3 break-words rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function CheckoutLegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      {children}
    </Link>
  );
}
