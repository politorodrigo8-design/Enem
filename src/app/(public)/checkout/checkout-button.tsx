"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CheckoutButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function startCheckout() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/payments/create", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        const nextMessage = payload.message ?? "Nao foi possivel iniciar o pagamento.";
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
        size="lg"
        full
        disabled={disabled || pending}
        onClick={startCheckout}
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
        {disabled ? "Lista de espera" : "Ir para pagamento"}
      </Button>
      {message ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          {message}
        </p>
      ) : null}
    </div>
  );
}
