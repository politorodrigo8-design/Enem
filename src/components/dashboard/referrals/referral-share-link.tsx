"use client";

import { AlertCircle, Check, Copy, Loader2, MessageCircle, RefreshCw, Share2 } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  ensureReferralCodeAction,
  recordReferralShareEventAction,
} from "@/lib/actions/referrals";
import { buildReferralUrl } from "@/lib/referrals/cookies";
import {
  buildReferralInviteMessage,
  referralProgramCopy,
} from "@/lib/referrals/constants";

type Feedback = { text: string; tone: "success" | "error" } | null;

export function ReferralShareLink({
  referralCode,
  siteUrl,
}: {
  referralCode: string;
  siteUrl: string;
}) {
  const inputId = useId();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [copied, setCopied] = useState(false);
  const [ensuredReferralCode, setEnsuredReferralCode] = useState("");
  const [isEventPending, startEventTransition] = useTransition();
  const [isEnsurePending, startEnsureTransition] = useTransition();
  const currentReferralCode = referralCode || ensuredReferralCode;

  const referralUrl = useMemo(
    () => (currentReferralCode ? buildReferralUrl(siteUrl, currentReferralCode) : ""),
    [siteUrl, currentReferralCode],
  );
  const shareText = buildReferralInviteMessage(referralUrl);

  function ensureLink() {
    setFeedback(null);
    startEnsureTransition(async () => {
      const result = await ensureReferralCodeAction();
      setFeedback({ text: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok && result.referralCode) {
        setEnsuredReferralCode(result.referralCode);
      }
    });
  }

  async function copyLink() {
    setFeedback(null);
    const didCopy = await copyTextToClipboard(referralUrl);

    if (!didCopy) {
      setCopied(false);
      setFeedback({
        text: "Não foi possível copiar automaticamente. Selecione o link acima e copie.",
        tone: "error",
      });
      return;
    }

    setCopied(true);
    setFeedback({ text: "Link copiado.", tone: "success" });
    window.setTimeout(() => setCopied(false), 2000);
    startEventTransition(() => {
      void recordReferralShareEventAction("referral_link_copied");
    });
  }

  async function shareLink() {
    setFeedback(null);
    if (!navigator.share) {
      window.open(whatsAppUrl(shareText), "_blank", "noopener,noreferrer");
      startEventTransition(() => {
        void recordReferralShareEventAction("referral_share_started");
      });
      return;
    }

    try {
      await navigator.share({
        title: referralProgramCopy.title,
        text: shareText,
        url: referralUrl,
      });
      setFeedback({ text: "Convite enviado.", tone: "success" });
      startEventTransition(() => {
        void recordReferralShareEventAction("referral_share_started");
      });
    } catch (error) {
      // Fechar a folha de compartilhamento do sistema dispara AbortError: é
      // desistência do aluno, não falha — não vale pintar de erro.
      const aborted = error instanceof Error && error.name === "AbortError";
      setFeedback(
        aborted
          ? { text: "Compartilhamento cancelado.", tone: "success" }
          : { text: "Não foi possível abrir o compartilhamento.", tone: "error" },
      );
    }
  }

  if (!currentReferralCode) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Seu link de indicação ainda não carregou.</p>
            <p className="mt-1 text-amber-800">
              Toque em gerar link para criar o seu agora. Todo aluno tem direito a
              um link próprio.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={ensureLink}
            disabled={isEnsurePending}
            className="shrink-0 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
          >
            {isEnsurePending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Gerar link
          </Button>
        </div>
        <FeedbackLine feedback={feedback} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="block min-w-0" htmlFor={inputId}>
          <span className="text-sm font-semibold text-slate-700">Link de indicação</span>
          <input
            id={inputId}
            readOnly
            value={referralUrl}
            // Seleção automática ao focar é o plano C de cópia: em navegador sem
            // clipboard e sem execCommand, o aluno só precisa do atalho de copiar.
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-100"
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={copyLink}
            disabled={isEventPending || isEnsurePending}
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            Copiar link
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={shareLink}
            disabled={isEventPending || isEnsurePending}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Compartilhar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FeedbackLine feedback={feedback} />
        <a
          className={buttonClasses({
            variant: "ghost",
            size: "sm",
            className: "self-start sm:self-auto",
          })}
          href={whatsAppUrl(shareText)}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            startEventTransition(() => {
              void recordReferralShareEventAction("referral_share_started");
            })
          }
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Enviar no WhatsApp
        </a>
      </div>
    </div>
  );
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  return (
    <p
      className={`flex min-h-5 items-center gap-1.5 text-sm font-semibold ${
        feedback?.tone === "error" ? "text-rose-700" : "text-emerald-700"
      }`}
      aria-live="polite"
    >
      {feedback?.tone === "error" ? (
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
      {feedback?.text ?? ""}
    </p>
  );
}

/**
 * navigator.clipboard só existe em contexto seguro: no celular, um acesso por
 * IP na rede ou um WebView antigo cai fora dele. A seleção com execCommand
 * ainda funciona nesses casos e é o que evita o botão morrer calado.
 */
async function copyTextToClipboard(value: string) {
  if (!value) return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Segue para o caminho legado.
    }
  }

  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "0";
    field.style.left = "0";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, value.length);
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  } catch {
    return false;
  }
}

function whatsAppUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
