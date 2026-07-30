"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adjustCustomerCreditsAction,
  setCustomerAccessAction,
} from "@/lib/actions/admin";

const fieldClass =
  "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-10";

export function CustomerAdminActions({
  userId,
  currentLevel,
  currentExpiresAt,
  currentBalance,
}: {
  userId: string;
  currentLevel: string;
  currentExpiresAt: string | null;
  currentBalance: number;
}) {
  const [pending, startTransition] = useTransition();
  const [level, setLevel] = useState(currentLevel);

  function handleAccess(formData: FormData) {
    startTransition(async () => {
      const result = await setCustomerAccessAction(formData);
      toast[result.ok ? "success" : "error"](result.message);
    });
  }

  function handleCredits(formData: FormData) {
    startTransition(async () => {
      const result = await adjustCustomerCreditsAction(formData);
      toast[result.ok ? "success" : "error"](result.message);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Acesso à plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleAccess} className="space-y-4">
            <input type="hidden" name="userId" value={userId} />
            <div>
              <label htmlFor="level" className="text-sm font-medium text-slate-700">
                Nível de acesso
              </label>
              <select
                id="level"
                name="level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className={fieldClass}
              >
                <option value="unpaid">Sem acesso</option>
                <option value="paid">Cliente completo</option>
                <option value="beta">Beta liberado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label htmlFor="expiresAt" className="text-sm font-medium text-slate-700">
                Expira em
              </label>
              <input
                id="expiresAt"
                name="expiresAt"
                type="date"
                defaultValue={currentExpiresAt ? currentExpiresAt.slice(0, 10) : ""}
                className={fieldClass}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Deixe vazio para acesso sem data de expiração.
              </p>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Salvar acesso
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajuste de créditos</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCredits} className="space-y-4">
            <input type="hidden" name="userId" value={userId} />
            <div>
              <label htmlFor="amount" className="text-sm font-medium text-slate-700">
                Quantidade
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="1"
                placeholder="Ex.: 20 para creditar, -10 para debitar"
                className={fieldClass}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Saldo atual: <span className="tnum font-semibold">{currentBalance}</span> crédito(s).
              </p>
            </div>
            <div>
              <label htmlFor="note" className="text-sm font-medium text-slate-700">
                Motivo (fica no extrato)
              </label>
              <input
                id="note"
                name="note"
                type="text"
                maxLength={200}
                placeholder="Ex.: cortesia por atraso na correção"
                className={fieldClass}
              />
            </div>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Aplicar ajuste
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
