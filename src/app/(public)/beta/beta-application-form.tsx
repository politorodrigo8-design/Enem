"use client";

import { Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitBetaApplicationAction } from "@/lib/actions/beta";
import type { BetaApplicationInput } from "@/lib/schemas/beta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BetaApplicationForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState<BetaApplicationInput>({
    full_name: "",
    email: "",
    city: "",
    school_year: "",
    previous_score: undefined,
    target_course: "",
    main_difficulty: "",
    whatsapp: "",
    contact_authorized: false,
    comments: "",
  });

  function submit() {
    startTransition(async () => {
      const result = await submitBetaApplicationAction(form);
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        setSent(true);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quero participar do beta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-bold text-emerald-900">Candidatura enviada</p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              A liberação do acesso completo será feita manualmente para alunos
              selecionados durante a fase beta.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nome" value={form.full_name} onChange={(full_name) => setForm((current) => ({ ...current, full_name }))} />
          <Input label="E-mail" type="email" value={form.email} onChange={(email) => setForm((current) => ({ ...current, email }))} />
          <Input label="Cidade" value={form.city} onChange={(city) => setForm((current) => ({ ...current, city }))} />
          <Input label="Ano escolar" value={form.school_year} onChange={(school_year) => setForm((current) => ({ ...current, school_year }))} />
          <Input
            label="Nota anterior no ENEM"
            type="number"
            value={String(form.previous_score ?? "")}
            onChange={(previous_score) => setForm((current) => ({ ...current, previous_score: previous_score ? Number(previous_score) : undefined }))}
          />
          <Input label="Curso desejado" value={form.target_course} onChange={(target_course) => setForm((current) => ({ ...current, target_course }))} />
          <Input label="Principal dificuldade" value={form.main_difficulty} onChange={(main_difficulty) => setForm((current) => ({ ...current, main_difficulty }))} />
          <Input label="WhatsApp" value={form.whatsapp ?? ""} onChange={(whatsapp) => setForm((current) => ({ ...current, whatsapp }))} />
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Comentários</span>
          <textarea
            value={form.comments ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, comments: event.target.value }))}
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-blue-400"
            placeholder="Conte algo que ajude a selecionar perfis diversos para a beta."
          />
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={form.contact_authorized}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contact_authorized: event.target.checked,
              }))
            }
            className="mt-1 h-4 w-4 accent-blue-700"
          />
          <span className="text-sm font-semibold leading-6 text-slate-700">
            Autorizo contato sobre a beta do Pontua Enem pelos dados informados.
          </span>
        </label>

        <Button
          type="button"
          full
          size="lg"
          disabled={pending || sent || !form.contact_authorized}
          onClick={submit}
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-5 w-5" aria-hidden="true" />
          )}
          Enviar candidatura
        </Button>
      </CardContent>
    </Card>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-400"
      />
    </label>
  );
}
