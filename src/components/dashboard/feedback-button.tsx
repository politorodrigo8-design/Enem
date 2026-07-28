"use client";

import { MessageSquare, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitFeedbackAction } from "@/lib/actions/beta";
import { Button } from "@/components/ui/button";
import { useLockPageScroll } from "@/lib/use-lock-page-scroll";
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

export function FeedbackButton({ minimal = false }: { minimal?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(initialForm);
  useLockPageScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

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
      {minimal ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 lg:min-h-0"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Enviar feedback
        </button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Enviar feedback
        </Button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto overscroll-contain bg-white/75 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-[1px] sm:pb-6 sm:pt-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="animate-pop max-h-full w-full max-w-lg overflow-y-auto overscroll-contain rounded-xl bg-white p-5 shadow-lg shadow-slate-900/15 sm:p-6">
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
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:h-9 sm:w-9"
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
                        "inline-flex min-h-11 items-center rounded-lg border px-3.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 lg:min-h-9",
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
                <div className="grid grid-cols-5 gap-1.5 sm:flex sm:gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={form.rating === value}
                      onClick={() => setForm((current) => ({ ...current, rating: value }))}
                      className={cn(
                        "tnum h-11 w-full rounded-lg border text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:w-11",
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
