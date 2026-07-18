"use client";

import { MessageSquare, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitFeedbackAction } from "@/lib/actions/beta";
import { Button } from "@/components/ui/button";

type FeedbackType = "erro" | "sugestao" | "duvida" | "elogio";

const feedbackTypes = [
  ["erro", "Erro"],
  ["sugestao", "Sugestao"],
  ["duvida", "Duvida"],
  ["elogio", "Elogio"],
] as const;

export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<{
    feedback_type: FeedbackType;
    message: string;
    rating: number;
    easy_to_understand: boolean;
  }>({
    feedback_type: "sugestao",
    message: "",
    rating: 5,
    easy_to_understand: true,
  });

  function submit() {
    startTransition(async () => {
      const result = await submitFeedbackAction({
        ...form,
        route: pathname,
        client_created_at: new Date().toISOString(),
      });
      toast[result.ok ? "success" : "error"](result.message);
      if (result.ok) {
        setOpen(false);
        setForm({
          feedback_type: "sugestao",
          message: "",
          rating: 5,
          easy_to_understand: true,
        });
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        Enviar feedback
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-title" className="text-lg font-bold text-slate-950">
                  Enviar feedback
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Sua resposta ajuda a ajustar a beta para alunos reais.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                onClick={() => setOpen(false)}
                aria-label="Fechar feedback"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Tipo</span>
                <select
                  value={form.feedback_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      feedback_type: event.target.value as FeedbackType,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                >
                  {feedbackTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Pagina atual</span>
                <input
                  value={pathname}
                  readOnly
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Mensagem</span>
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, message: event.target.value }))
                  }
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-blue-400"
                  placeholder="Conte o que aconteceu ou o que poderia melhorar."
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Nota: {form.rating}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={form.rating}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, rating: Number(event.target.value) }))
                  }
                  className="mt-2 w-full accent-blue-700"
                />
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={form.easy_to_understand}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      easy_to_understand: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-blue-700"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Esta tela foi facil de entender?
                </span>
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={pending || form.message.trim().length < 8}
                onClick={submit}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
