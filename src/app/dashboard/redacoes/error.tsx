"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminEssaysError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Não foi possível carregar a fila"
      description="Tente novamente. Se persistir, verifique a conexão e volte para Hoje."
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset}>Tentar novamente</Button>
          <Link href="/dashboard" className={buttonClasses({ variant: "outline" })}>
            Voltar para Hoje
          </Link>
        </div>
      }
    />
  );
}
