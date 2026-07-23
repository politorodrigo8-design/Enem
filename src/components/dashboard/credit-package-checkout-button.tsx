"use client";

import Link from "next/link";
import { Loader2, ShoppingCart, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentLegalAcceptanceVersions } from "@/lib/legal/config";

export function CreditPackageCheckoutButton({
  productSlug,
  credits,
  price,
  accountEmail,
  disabled = false,
  variant = "outline",
}: {
  productSlug: string;
  credits: number;
  price: string;
  accountEmail: string;
  disabled?: boolean;
  variant?: "primary" | "outline";
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isDisabled = disabled || pending;
  const canContinue = !isDisabled && legalAccepted;

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        setOpen(false);
        setLegalAccepted(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, pending]);

  function closeModal() {
    if (pending) return;
    setOpen(false);
    setLegalAccepted(false);
  }

  function startCheckout() {
    if (!canContinue) return;

    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          legalAcceptance: currentLegalAcceptanceVersions(),
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        const nextMessage = payload.message ?? "Não foi possível iniciar a compra.";
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
      <Button
        type="button"
        variant={variant}
        full
        disabled={isDisabled}
        onClick={() => {
          setMessage("");
          setLegalAccepted(false);
          setOpen(true);
        }}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Abrindo checkout..." : "Comprar pacote"}
      </Button>
      {message ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
          {message}
        </p>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`credit-package-title-${productSlug}`}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl shadow-slate-950/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Compra de créditos
                </p>
                <h2
                  id={`credit-package-title-${productSlug}`}
                  className="mt-1 text-xl font-bold tracking-tight text-slate-950"
                >
                  Confirmar compra de {credits} créditos
                </h2>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                onClick={closeModal}
                aria-label="Fechar confirmação"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p>
                Valor: <span className="font-bold text-slate-950">{price}</span>
              </p>
              <p>
                Os créditos serão adicionados à conta{" "}
                <span className="font-bold text-slate-950">
                  {accountEmail || "aluno Pontua Enem"}
                </span>{" "}
                após a confirmação do pagamento.
              </p>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(event) => setLegalAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-2 focus:ring-blue-600/20"
              />
              <span>
                Li e concordo com os{" "}
                <ModalLegalLink href="/termos">Termos de Uso</ModalLegalLink> e com a{" "}
                <ModalLegalLink href="/reembolso">Política de Reembolso</ModalLegalLink> e
                declaro que li a{" "}
                <ModalLegalLink href="/privacidade">Política de Privacidade</ModalLegalLink>.
              </span>
            </label>

            {message ? (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                {message}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                ref={cancelRef}
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={startCheckout} disabled={!canContinue}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                )}
                Continuar para o pagamento
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModalLegalLink({ href, children }: { href: string; children: React.ReactNode }) {
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
