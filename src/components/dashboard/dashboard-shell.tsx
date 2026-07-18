"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Coins,
  LayoutDashboard,
  LogOut,
  Menu,
  Radar,
  Settings,
  Target,
  X,
  ClipboardList,
  FilePenLine,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/actions/auth";
import { FeedbackButton } from "@/components/dashboard/feedback-button";
import type { AccessLevel } from "@/lib/access";
import { accessLevelLabel } from "@/lib/access";

const navigation = [
  { label: "Visão geral", href: "/dashboard", icon: LayoutDashboard },
  { label: "Meu diagnóstico", href: "/dashboard/diagnostico", icon: ClipboardList },
  { label: "Radar ENEM", href: "/dashboard/radar", icon: Radar },
  { label: "Banco de questões", href: "/dashboard/questoes", icon: BookOpen },
  { label: "Simulados", href: "/dashboard/simulados", icon: Target },
  { label: "Plano de estudos", href: "/dashboard/plano", icon: CalendarDays },
  { label: "Meu desempenho", href: "/dashboard/desempenho", icon: BarChart3 },
  { label: "Revisão de erros", href: "/dashboard/revisao", icon: SearchCheck },
  { label: "Treino prioritário", href: "/dashboard/treino-prioritario", icon: ShieldCheck },
  { label: "Editorial", href: "/dashboard/editorial", icon: FilePenLine, adminOnly: true },
  { label: "Créditos", href: "/dashboard/creditos", icon: Coins },
  { label: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
];

export function DashboardShell({
  children,
  fullName,
  email,
  accessLevel,
  betaTester,
}: {
  children: React.ReactNode;
  fullName: string;
  email: string;
  accessLevel: AccessLevel;
  betaTester: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const accessLabel = accessLevelLabel(accessLevel);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Logo />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 px-3 py-4" aria-label="Menu do aluno">
          {navigation.filter((item) => !item.adminOnly || accessLevel === "admin").map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-blue-700 text-white shadow-sm shadow-blue-900/20"
                    : "text-slate-700 hover:bg-slate-100 hover:text-blue-700",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-700">
              <SearchCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-950">{accessLabel}</p>
              <p className="text-xs leading-5 text-blue-800">
                {betaTester ? "Acesso de testes" : "Pagamento unico"}
              </p>
            </div>
          </div>
        </div>
      </aside>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu lateral"
        />
      ) : null}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-500">NexoENEM</p>
              <p className="text-base font-bold text-slate-950">Área do aluno</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <FeedbackButton />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-950">{fullName}</p>
              <p className="text-xs text-slate-500">
                {email || accessLabel}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
              {initials || "NE"}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 md:hidden">
            <FeedbackButton />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
