import { Button } from "@/components/ui/button";

export function AiGenerationError({
  message,
  fallback,
  onRetry,
}: {
  message: string;
  fallback: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-semibold text-rose-900">{message || fallback}</p>
      <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
