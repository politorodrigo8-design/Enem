"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <Card>
      <CardContent className="text-center">
        <h2 className="text-xl font-bold text-slate-950">
          Não foi possível carregar esta área.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Este é um estado de erro preparado para futuras integrações de dados.
          Tente recarregar a página.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}
