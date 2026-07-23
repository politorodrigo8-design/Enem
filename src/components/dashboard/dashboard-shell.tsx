"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  Coins,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Radar,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { RevealController } from "@/components/ui/reveal-controller";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/actions/auth";
import { FeedbackButton } from "@/components/dashboard/feedback-button";
import type { AccessLevel } from "@/lib/access";

const navigation = [
  {
    group: null,
    items: [
      { label: "Hoje", href: "/dashboard", icon: LayoutDashboard },
      { label: "Praticar", href: "/dashboard/praticar", icon: BookOpen },
      { label: "Simulados", href: "/dashboard/simulados", icon: Target },
      { label: "Radar ENEM", href: "/dashboard/radar", icon: Radar },
      { label: "Correção de redação", href: "/dashboard/correcao-redacao", icon: FileText },
    ],
  },
  {
    group: "Conta",
    items: [
      { label: "Correções", href: "/dashboard/redacoes", icon: FileCheck2, adminOnly: true },
      { label: "Créditos", href: "/dashboard/creditos", icon: Coins },
    ],
  },
];

export function DashboardShell({
  children,
  fullName,
  email,
  accessLevel,
}: {
  children: React.ReactNode;
  fullName: string;
  email: string;
  accessLevel: AccessLevel;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-slate-50">
      <RevealController />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
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
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Menu do aluno">
          {navigation.map((section) => {
            const items = section.items.filter(
              (item) => !("adminOnly" in item && item.adminOnly) || accessLevel === "admin",
            );
            if (!items.length) return null;

            return (
              <div key={section.group ?? "principal"}>
                {section.group ? (
                  <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {section.group}
                  </p>
                ) : null}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-blue-50 font-semibold text-blue-900"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        <Icon
                          className={cn("h-4.5 w-4.5", active ? "text-blue-700" : "text-slate-400")}
                          aria-hidden="true"
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-slate-100 px-5 py-3">
          <FeedbackButton minimal />
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
            <p className="hidden text-sm font-semibold text-slate-500 sm:block">
              Bons estudos, {fullName.split(" ")[0] || "aluno"}
            </p>
          </div>
          <UserMenu fullName={fullName} email={email} initials={initials} />
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="animate-rise">{children}</div>
        </main>
      </div>
    </div>
  );
}

function UserMenu({
  fullName,
  email,
  initials,
}: {
  fullName: string;
  email: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
          {initials || "NE"}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight text-slate-950">
            {fullName}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-pop absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-950">{fullName}</p>
            {email ? <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p> : null}
          </div>
          <div className="p-1.5">
            <Link
              href="/dashboard/configuracoes"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              <UserRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Meu perfil
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair da conta
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
