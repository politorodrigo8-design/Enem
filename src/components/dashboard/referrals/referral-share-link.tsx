"use client";

import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { recordReferralShareEventAction } from "@/lib/actions/referrals";
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
  const [isPending, startTransition] = useTransition();
  const referralUrl = useMemo(
    () => buildReferralUrl(siteUrl, referralCode),
    [siteUrl, referralCode],
  );
  const shareText = `${referralProgramCopy.shortDescription} Use meu link: ${referralUrl}`;

  async function copyLink() {
    setFeedback("");
    try {
      await navigator.clipboard.writeText(referralUrl);
      setFeedback("Link copiado");
      startTransition(() => {
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
      startTransition(() => {
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
      startTransition(() => {
        void recordReferralShareEventAction("referral_share_started");
      });
    } catch {
      setFeedback("Compartilhamento cancelado");
    }
  }

  if (!referralCode) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
        Seu código está sendo preparado. Atualize a página em instantes.
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
          <Button type="button" variant="outline" onClick={copyLink} disabled={isPending}>
            {feedback === "Link copiado" ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            Copiar link
          </Button>
          <Button type="button" variant="primary" onClick={shareLink} disabled={isPending}>
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
            startTransition(() => {
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
