"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Coins,
  FileCheck2,
  LayoutDashboard,
  Menu,
  PenLine,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/ui/account-menu";
import { Logo } from "@/components/ui/logo";
import { RevealController } from "@/components/ui/reveal-controller";
import { cn } from "@/lib/utils";
import { FeedbackButton } from "@/components/dashboard/feedback-button";
import type { AccessLevel } from "@/lib/access";
import { useLockPageScroll } from "@/lib/use-lock-page-scroll";
import { isProfilePhotoDataUrl, PROFILE_PHOTO_UPDATED_EVENT } from "@/lib/profile-photo";

const navigation = [
  {
    group: null,
    items: [
      { label: "Hoje", href: "/dashboard", icon: LayoutDashboard },
      { label: "Praticar", href: "/dashboard/praticar", icon: BookOpen },
      { label: "Simulados", href: "/dashboard/simulados", icon: Target },
      { label: "Redação", href: "/dashboard/correcao-redacao", icon: PenLine },
      { label: "Desempenho", href: "/dashboard/desempenho", icon: BarChart3 },
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
  profilePhotoUrl,
}: {
  children: React.ReactNode;
  fullName: string;
  email: string;
  accessLevel: AccessLevel;
  profilePhotoUrl: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profilePhotoOverride, setProfilePhotoOverride] = useState<string | null>(null);
  useLockPageScroll(open);
  const currentProfilePhotoUrl = profilePhotoOverride ?? profilePhotoUrl;

  useEffect(() => {
    function handleProfilePhotoUpdated(event: Event) {
      const nextUrl = (event as CustomEvent<{ profilePhotoUrl?: unknown }>).detail
        ?.profilePhotoUrl;
      setProfilePhotoOverride(isProfilePhotoDataUrl(nextUrl) ? nextUrl : "");
    }

    window.addEventListener(PROFILE_PHOTO_UPDATED_EVENT, handleProfilePhotoUpdated);
    return () => {
      window.removeEventListener(PROFILE_PHOTO_UPDATED_EVENT, handleProfilePhotoUpdated);
    };
  }, []);

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
        <nav
          className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4"
          aria-label="Menu do aluno"
        >
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
          className="fixed inset-0 z-40 bg-white/70 backdrop-blur-[1px] lg:hidden"
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
          <AccountMenu
            fullName={fullName}
            email={email}
            profilePhotoUrl={currentProfilePhotoUrl}
            items={[
              { label: "Meu perfil", href: "/dashboard/configuracoes", icon: UserRound },
              { label: "Meu diagnóstico", href: "/dashboard/diagnostico", icon: ClipboardList },
            ]}
          />
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="animate-rise">{children}</div>
        </main>
      </div>
    </div>
  );
}

