"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Send } from "lucide-react";
import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { recordProductEventAction } from "@/lib/actions/beta";
import { cn } from "@/lib/utils";

type PremiumGateProps = {
  feature: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
};

export function PremiumGate({
  feature,
  children,
  className,
  compact = false,
}: PremiumGateProps) {
  const pathname = usePathname();

  useEffect(() => {
    void recordProductEventAction({
      eventName: "premium_block_seen",
      route: pathname,
      metadata: { feature },
    });
  }, [feature, pathname]);

  return (
    <div className={cn("space-y-4", className)}>
      {children}
      <Notice tone="info" icon={Lock}>
        <div className={compact ? "space-y-3" : "space-y-4"}>
          <div>
            <p className="font-semibold text-blue-950">Acesso necessário</p>
            <p className="mt-1">
              {feature} faz parte do Pontua Enem Completo. Finalize a compra para
              liberar o acesso.
            </p>
          </div>
          <Link href="/checkout" className={buttonClasses({ variant: "primary", size: "sm" })}>
            <Send className="h-4 w-4" aria-hidden="true" />
            Concluir compra
          </Link>
        </div>
      </Notice>
    </div>
  );
}
