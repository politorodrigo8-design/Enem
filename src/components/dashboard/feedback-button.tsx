"use client";

import { MessageSquare, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitFeedbackAction } from "@/lib/actions/beta";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FeedbackType = "erro" | "sugestao" | "duvida" | "elogio";

const feedbackTypes = [
  ["erro", "Erro"],
  ["sugestao", "Sugestão"],
  ["duvida", "Dúvida"],
  ["elogio", "Elogio"],
] as const;

const initialForm = {
  feedback_type: "sugestao" as FeedbackType,
  message: "",
  rating: 5,
  easy_to_understand: true,
};

export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(initialForm);

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
        setForm(initialForm);
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
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg shadow-slate-900/15">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-title" className="text-lg font-bold text-slate-950">
                  Enviar feedback
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Sua resposta ajuda a melhorar a plataforma para quem estuda
                  com ela.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setOpen(false)}
                aria-label="Fechar feedback"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 grid gap-5">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">
                  Sobre o que é?
                </legend>
                <div className="flex flex-wrap gap-2">
                  {feedbackTypes.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={form.feedback_type === value}
                      onClick={() =>
                        setForm((current) => ({ ...current, feedback_type: value }))
                      }
                      className={cn(
                        "rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
                        form.feedback_type === value
                          ? "border-blue-700 bg-blue-50 text-blue-900"
                          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mensagem
                </span>
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, message: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-950 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  placeholder="Conte o que aconteceu ou o que poderia melhorar."
                />
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">
                  Que nota você dá para esta tela?
                </legend>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={form.rating === value}
                      onClick={() => setForm((current) => ({ ...current, rating: value }))}
                      className={cn(
                        "tnum h-10 w-10 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700",
                        form.rating === value
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-center gap-3">
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
                <span className="text-sm font-medium text-slate-700">
                  Esta tela foi fácil de entender
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
