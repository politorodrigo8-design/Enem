"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminEssaysError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Não foi possível carregar a fila"
      description="Tente novamente. Se persistir, confira as migrations e as políticas de acesso."
      action={<Button onClick={reset}>Tentar novamente</Button>}
    />
  );
}

