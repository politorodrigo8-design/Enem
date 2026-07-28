"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RotateCcw } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackButton } from "@/components/dashboard/feedback-button";

export default function DashboardError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  // `reset` apenas limpa o erro; quem refaz a busca de dados é `unstable_retry`
  // (Next 16.2). Sem ele, o "tentar novamente" cai no mesmo erro.
  const retry = unstable_retry ?? reset;

  useEffect(() => {
    console.error("[Pontua Enem] dashboard.error_boundary", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <Card>
      <CardContent className="text-center">
        <h2 className="text-xl font-bold text-slate-950">
          Não foi possível carregar esta área.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Seus dados de estudo estão salvos. Tente carregar de novo — se o
          problema continuar, confira sua conexão, volte para Hoje e nos conte o
          que aconteceu pelo botão de feedback.
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="sm" onClick={retry}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
          <Link
            href="/dashboard"
            className={buttonClasses({ variant: "outline", size: "sm" })}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Voltar para Hoje
          </Link>
          <FeedbackButton />
        </div>
      </CardContent>
    </Card>
  );
}
