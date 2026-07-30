"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { label: "Visão geral", href: "/dashboard/admin" },
  { label: "Clientes", href: "/dashboard/admin/clientes" },
  { label: "Pagamentos", href: "/dashboard/admin/pagamentos" },
  { label: "Faturamento", href: "/dashboard/admin/faturamento" },
  { label: "Operação", href: "/dashboard/admin/atividade" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      // Rolagem horizontal no mobile: cinco abas não cabem em 320px e quebrar
      // em duas linhas empurraria o conteúdo da página para baixo.
      className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      aria-label="Seções administrativas"
    >
      <div className="flex min-w-max items-center gap-1 border-b border-slate-200 pb-px">
        {links.map((link) => {
          const active =
            link.href === "/dashboard/admin"
              ? pathname === link.href
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors sm:min-h-10",
                active
                  ? "border-blue-700 text-blue-800"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
