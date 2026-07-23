"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLockPageScroll } from "@/lib/use-lock-page-scroll";
import { cn } from "@/lib/utils";

export function AiResponsivePanel({
  open,
  title,
  mode,
  busy,
  openerRef,
  onClose,
  action,
  wide,
  children,
}: {
  open: boolean;
  title: string;
  mode: "drawer" | "modal";
  busy: boolean;
  openerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  action?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useLockPageScroll(open);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [busy, onClose, open, openerRef]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [busy, open, title]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className={cn(
          "absolute inset-0 cursor-default",
          mode === "drawer" ? "bg-transparent" : "bg-white/70 backdrop-blur-[1px]",
        )}
        aria-label="Fechar painel"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-panel-title"
        tabIndex={-1}
        className={cn(
          "fixed flex max-h-[100dvh] flex-col overflow-hidden bg-white shadow-2xl outline-none",
          "pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
          mode === "drawer"
            ? "inset-y-0 right-0 w-full sm:max-w-[620px] sm:inset-y-3 sm:right-3 sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-xl sm:border sm:border-slate-200"
            : "inset-x-0 bottom-0 top-0 w-full sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
          mode === "modal" && (wide ? "sm:max-w-[1040px]" : "sm:max-w-[860px]"),
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 id="ai-panel-title" className="text-base font-bold text-slate-950">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Resultado organizado para estudo.</p>
          </div>
          <div className="flex items-center gap-2">
            {action}
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy} aria-label="Fechar">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>
        <div
          ref={contentRef}
          className="min-h-0 flex-1 scroll-pt-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
