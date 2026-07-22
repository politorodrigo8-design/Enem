"use client";

import { Download, ExternalLink, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { createEssayFileSignedUrlAction } from "@/lib/actions/credits";
import { Button } from "@/components/ui/button";

export function EssayFileButton({
  fileId,
  label = "Abrir arquivo",
  download = false,
}: {
  fileId: string;
  label?: string;
  download?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function openFile() {
    startTransition(async () => {
      const result = await createEssayFileSignedUrlAction(fileId);
      if (!result.ok || !result.url) {
        toast.error(result.message);
        return;
      }
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = result.url;
        anchor.download = result.fileName || "redacao";
        anchor.rel = "noopener noreferrer";
        anchor.click();
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Button type="button" variant="outline" onClick={openFile} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : download ? (
        <Download className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
