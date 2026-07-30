"use client";

import { useEffect, useRef } from "react";
import { trackTikTokEvent } from "@/lib/analytics/tiktok";

/**
 * Eventos de produto que o TikTok exige no funil e que acontecem por "estar na
 * página", não por clique. O pageview não substitui nenhum deles: a etapa
 * Awareness e os públicos de retargeting só enxergam eventos padrão.
 *
 * Vão sem `event_id` porque não têm contraparte pelo Events API — mandar um id
 * em evento exclusivo do navegador desligaria a dedup por cookie sem ganho.
 */
export function TikTokProductEvent({
  event,
  contentId,
  contentName,
  amountCents,
}: {
  event: "ViewContent" | "AddToCart";
  contentId: string;
  contentName: string;
  amountCents: number;
}) {
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;

    trackTikTokEvent(event, {
      content_type: "product",
      content_id: contentId,
      content_name: contentName,
      currency: "BRL",
      value: Math.round(amountCents) / 100,
    });
  }, [amountCents, contentId, contentName, event]);

  return null;
}
