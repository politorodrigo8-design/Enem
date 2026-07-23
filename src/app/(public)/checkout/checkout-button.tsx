"use client";

import Link from "next/link";
import { Loader2, LockKeyhole } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentLegalAcceptanceVersions } from "@/lib/legal/config";

export function CheckoutButton({
  disabled = false,
  disabledMessage,
}: {
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const isDisabled = disabled || pending || !legalAccepted;

  function startCheckout() {
    if (disabled || !legalAccepted) return;

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
      <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          checked={legalAccepted}
          onChange={(event) => setLegalAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-2 focus:ring-blue-600/20"
        />
        <span>
          Li e concordo com os{" "}
          <CheckoutLegalLink href="/termos">Termos de Uso</CheckoutLegalLink> e com a{" "}
          <CheckoutLegalLink href="/reembolso">Política de Reembolso</CheckoutLegalLink> e
          declaro que li a{" "}
          <CheckoutLegalLink href="/privacidade">Política de Privacidade</CheckoutLegalLink>.
        </span>
      </label>
      <Button
        type="button"
        size="lg"
        full
        disabled={isDisabled}
        onClick={startCheckout}
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
        {disabled ? "Pagamento indisponível" : "Finalizar compra"}
      </Button>
      {!legalAccepted ? (
        <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm font-semibold leading-6 text-slate-700">
          Marque o aceite dos documentos legais para finalizar a compra.
        </p>
      ) : null}
      {disabledMessage ? (
        <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm font-semibold leading-6 text-slate-700">
          {disabledMessage}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
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
