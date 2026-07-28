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
      {/* No mobile cada prioridade ocupa a linha inteira para o botão remover ter 44px de toque. */}
      <ul className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {priorities.map((priority) => (
          <li
            key={priority.topic}
            className="flex items-center justify-between gap-1 rounded-md bg-blue-50 pl-2 text-xs font-semibold text-blue-800 ring-1 ring-blue-100 sm:justify-start"
          >
            <span className="min-w-0 break-words py-1">
              {formatTopicPath(priority.area, priority.subject, priority.topic)}
            </span>
            <button
              type="button"
              onClick={() => onRemove(priority.topic)}
              aria-label={`Remover ${priority.topic}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-blue-700 transition-colors hover:bg-blue-100 hover:text-blue-900 sm:h-6 sm:w-6"
            >
              <X className="h-4 w-4 sm:h-3 sm:w-3" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
