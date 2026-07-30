"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackTikTokPageView } from "@/lib/analytics/tiktok";

/**
 * O ttq.page() do base code roda uma única vez, no carregamento. No App Router a
 * troca de rota é client-side e não recarrega nada, então sem isto o TikTok veria
 * só a primeira tela de cada sessão — o que esvazia públicos de retargeting.
 */
export function TikTokPixelPageViews() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    trackTikTokPageView();
  }, [pathname]);

  return null;
}
