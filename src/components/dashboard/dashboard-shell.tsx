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
  Loader2,
  Menu,
  PenLine,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AccountMenu } from "@/components/ui/account-menu";
import { Logo } from "@/components/ui/logo";
import { RevealController } from "@/components/ui/reveal-controller";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { acceptCurrentLegalDocumentsAction } from "@/lib/actions/legal";
import {
  currentLegalAcceptanceVersions,
  type LegalDocumentConfig,
} from "@/lib/legal/config";
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
  pendingLegalDocuments,
}: {
  children: React.ReactNode;
  fullName: string;
  email: string;
  accessLevel: AccessLevel;
  profilePhotoUrl: string;
  pendingLegalDocuments: LegalDocumentConfig[];
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
      {pendingLegalDocuments.length ? (
        <LegalReacceptanceModal documents={pendingLegalDocuments} />
      ) : null}
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

function LegalReacceptanceModal({ documents }: { documents: LegalDocumentConfig[] }) {
  const [accepted, setAccepted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  function submitAcceptance() {
    if (!accepted) return;

    startTransition(async () => {
      const result = await acceptCurrentLegalDocumentsAction({
        legalAcceptance: currentLegalAcceptanceVersions(),
      });

      if (!result.ok) {
        toast.error("Não foi possível registrar os aceites", {
          description: result.message,
        });
        return;
      }

      toast.success("Aceites registrados");
      setOpen(false);
      window.location.reload();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-reacceptance-title"
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl shadow-slate-950/20"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Documentos atualizados
        </p>
        <h2
          id="legal-reacceptance-title"
          className="mt-1 text-xl font-bold tracking-tight text-slate-950"
        >
          Revise os documentos vigentes
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Para continuar usando a plataforma, registre sua manifestação sobre as versões
          vigentes dos documentos abaixo.
        </p>

        <ul className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {documents.map((document) => (
            <li key={document.type}>
              <Link
                href={document.href}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                {document.title}
              </Link>{" "}
              · versão {document.version}
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-2 focus:ring-blue-600/20"
            />
            <span>
              Li e concordo com os Termos de Uso e com a Política de Reembolso, e
              declaro que li e estou ciente da Política de Privacidade.
            </span>
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            ref={primaryRef}
            type="button"
            onClick={submitAcceptance}
            disabled={!accepted || pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}

