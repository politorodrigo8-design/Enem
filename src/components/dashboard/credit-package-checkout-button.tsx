"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CreditPackageCheckoutButton({
  productSlug,
  disabled = false,
  variant = "outline",
}: {
  productSlug: string;
  disabled?: boolean;
  variant?: "primary" | "outline";
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const isDisabled = disabled || pending;

  function startCheckout() {
    if (disabled) return;

    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug }),
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
        onClick={startCheckout}
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
    </div>
  );
}
