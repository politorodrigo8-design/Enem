"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createEssayFileSignedUrlAction } from "@/lib/actions/credits";
import type { EssaySubmissionFile } from "@/lib/db/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLockPageScroll } from "@/lib/use-lock-page-scroll";

export function EssayFilesViewer({ files }: { files: EssaySubmissionFile[] }) {
  const orderedFiles = useMemo(
    () => [...files].sort((a, b) => a.page_order - b.page_order),
    [files],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = activeIndex !== null && signedUrl !== null;
  useLockPageScroll(open);

  // Esc fecha e Tab circula dentro do painel — o lightbox é modal.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }
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
    };
  }, [open]);

  function openFile(index: number, mode: "modal" | "tab" | "download" = "modal") {
    const file = orderedFiles[index];
    if (!file) return;

    startTransition(async () => {
      const result = await createEssayFileSignedUrlAction(file.id);
      if (!result.ok || !result.url) {
        toast.error(result.message);
        return;
      }

      if (mode === "download") {
        const anchor = document.createElement("a");
        anchor.href = result.url;
        anchor.download = result.fileName || `redacao-pagina-${file.page_order}`;
        anchor.click();
        return;
      }

      if (mode === "tab" || file.mime_type === "application/pdf") {
        window.open(result.url, "_blank", "noopener,noreferrer");
        return;
      }

      setActiveIndex(index);
      setSignedUrl(result.url);
    });
  }

  function navigate(direction: -1 | 1) {
    if (activeIndex === null) return;
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= orderedFiles.length) return;
    openFile(nextIndex);
  }

  if (!orderedFiles.length) {
    return <p className="text-sm text-slate-500">Nenhum arquivo registrado.</p>;
  }

  const activeFile = activeIndex === null ? null : orderedFiles[activeIndex];

  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {orderedFiles.map((file, index) => (
          <li key={file.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone={index === 0 ? "blue" : "slate"}>
                  Página {file.page_order}
                </Badge>
                <p className="mt-2 truncate text-sm font-semibold text-slate-950">
                  {file.original_name || `pagina-${file.page_order}`}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {file.mime_type === "application/pdf" ? "PDF" : "Imagem"} ·{" "}
                  {formatBytes(file.size_bytes)}
                </p>
              </div>
              {pending ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => openFile(index)}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Abrir
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => openFile(index, "download")}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Baixar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {activeFile && signedUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            aria-label="Fechar visualização"
            className="absolute inset-0 cursor-default bg-slate-100/90 backdrop-blur-[1px]"
            onClick={() => setActiveIndex(null)}
          />
          {/* max-h-full em vez de vh: a altura útil já desconta o padding do
              contêiner e a área segura inferior. */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Arquivo da redação, página ${activeFile.page_order}`}
            tabIndex={-1}
            className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl outline-none"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">
                  Página {activeFile.page_order}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {activeFile.original_name || activeFile.storage_path}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Fechar"
                onClick={() => setActiveIndex(null)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt={`Página ${activeFile.page_order}`}
                className="h-full max-h-full w-full object-contain"
              />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                disabled={activeIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(1)}
                disabled={activeIndex === orderedFiles.length - 1}
              >
                Próxima
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
