"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { cleanupAbandonedEssayUploadsAction } from "@/lib/actions/credits";
import { Button } from "@/components/ui/button";

export function EssayCleanupButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        startTransition(async () => {
          const result = await cleanupAbandonedEssayUploadsAction();
          toast[result.ok ? "success" : "error"](result.message);
        });
      }}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      )}
      Limpar abandonados
    </Button>
  );
}
