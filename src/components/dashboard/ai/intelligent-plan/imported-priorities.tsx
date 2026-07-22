import { X } from "lucide-react";
import type { ImportedPriority } from "../ai-types";
import { formatTopicPath } from "../ai-utils";

export function ImportedPriorities({
  priorities,
  onRemove,
}: {
  priorities: ImportedPriority[];
  onRemove: (topic: string) => void;
}) {
  if (!priorities.length) return null;
  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3">
      <p className="text-xs font-bold text-slate-600">Prioridades importadas</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {priorities.map((priority) => (
          <span key={priority.topic} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-100">
            {formatTopicPath(priority.area, priority.subject, priority.topic)}
            <button type="button" onClick={() => onRemove(priority.topic)} aria-label={`Remover ${priority.topic}`}>
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
