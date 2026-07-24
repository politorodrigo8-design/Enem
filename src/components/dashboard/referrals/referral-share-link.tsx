"use client";

import { Check, Copy, Loader2, MessageCircle, RefreshCw, Share2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  ensureReferralCodeAction,
  recordReferralShareEventAction,
} from "@/lib/actions/referrals";
import { buildReferralUrl } from "@/lib/referrals/cookies";
import { referralProgramCopy } from "@/lib/referrals/constants";

export function ReferralShareLink({
  referralCode,
  siteUrl,
}: {
  referralCode: string;
  siteUrl: string;
}) {
  const [feedback, setFeedback] = useState("");
  const [ensuredReferralCode, setEnsuredReferralCode] = useState("");
  const [isEventPending, startEventTransition] = useTransition();
  const [isEnsurePending, startEnsureTransition] = useTransition();
  const currentReferralCode = referralCode || ensuredReferralCode;

  const referralUrl = useMemo(
    () => (currentReferralCode ? buildReferralUrl(siteUrl, currentReferralCode) : ""),
    [siteUrl, currentReferralCode],
  );
  const shareText = `${referralProgramCopy.shortDescription} Use meu link: ${referralUrl}`;

  function ensureLink() {
    setFeedback("");
    startEnsureTransition(async () => {
      const result = await ensureReferralCodeAction();
      setFeedback(result.message);
      if (result.ok && result.referralCode) {
        setEnsuredReferralCode(result.referralCode);
      }
    });
  }

  async function copyLink() {
    setFeedback("");
    try {
      await navigator.clipboard.writeText(referralUrl);
      setFeedback("Link copiado");
      startEventTransition(() => {
        void recordReferralShareEventAction("referral_link_copied");
      });
    } catch {
      setFeedback("Não foi possível copiar");
    }
  }

  async function shareLink() {
    setFeedback("");
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
        text: referralProgramCopy.shortDescription,
        url: referralUrl,
      });
      setFeedback("Compartilhamento iniciado");
      startEventTransition(() => {
        void recordReferralShareEventAction("referral_share_started");
      });
    } catch {
      setFeedback("Compartilhamento cancelado");
    }
  }

  if (!currentReferralCode) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Seu link de indicação ainda não está disponível.</p>
            <p className="mt-1 text-amber-800">
              Tente gerar o link agora. Se continuar indisponível, a conexão com a
              conta precisa ser conferida.
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
        <p className="mt-3 min-h-5 font-semibold" aria-live="polite">
          {feedback}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="block min-w-0" htmlFor="referral-link">
          <span className="text-sm font-semibold text-slate-700">Link de indicação</span>
          <input
            id="referral-link"
            readOnly
            value={referralUrl}
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none"
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={copyLink}
            disabled={isEventPending || isEnsurePending}
          >
            {feedback === "Link copiado" ? (
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
        <p className="min-h-5 text-sm font-semibold text-emerald-700" aria-live="polite">
          {feedback}
        </p>
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
          WhatsApp
        </a>
      </div>
    </div>
  );
}

function whatsAppUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
