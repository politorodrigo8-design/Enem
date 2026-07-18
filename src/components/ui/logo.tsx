import Link from "next/link";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 font-bold text-slate-950", className)}
      aria-label="NexoENEM - página inicial"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white shadow-sm shadow-blue-900/20">
        <Target className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-lg">NexoENEM</span>
    </Link>
  );
}
