"use client";

import Link from "next/link";
import { ArrowRight, LogIn, Menu, X } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { AccountMenu } from "@/components/ui/account-menu";
import { ctaClasses } from "@/components/ui/cta";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { PublicViewer } from "@/lib/db/queries";
import { landingNavLinks } from "./landing-data";

type LandingHeaderProps = {
  ctaHref: string;
  viewer: PublicViewer | null;
};

export function LandingHeader({ ctaHref, viewer }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const primaryCta = viewer?.hasPlatformAccess
    ? { href: "/dashboard", label: "Acessar painel" }
    : { href: ctaHref, label: "Começar agora" };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSectionLinkClick(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    const hash = href.startsWith("/#") ? href.slice(2) : null;
    if (!hash || window.location.pathname !== "/") {
      setOpen(false);
      return;
    }

    const target = document.getElementById(hash);
    if (!target) return;

    event.preventDefault();
    setOpen(false);
    window.history.pushState(null, "", `#${hash}`);
    target.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled
          ? "border-blue-100 bg-white/90 backdrop-blur-md"
          : "border-transparent bg-white",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav
          className="hidden items-center gap-1 whitespace-nowrap md:flex lg:gap-3"
          aria-label="Navegação principal"
        >
          {landingNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(event) => handleSectionLinkClick(event, link.href)}
              className="inline-flex min-h-10 items-center rounded-[14px] px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-3 md:flex">
            {viewer ? null : (
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Entrar
              </Link>
            )}
            <Link
              href={primaryCta.href}
              className={ctaClasses({ size: "md" })}
            >
              {primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {viewer ? (
            <AccountMenu
              fullName={viewer.fullName}
              email={viewer.email}
              profilePhotoUrl={viewer.profilePhotoUrl}
            />
          ) : null}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-white text-slate-700 shadow-sm shadow-blue-900/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div
          id="landing-mobile-menu"
          className="border-t border-blue-100 bg-white px-4 py-4 shadow-sm shadow-blue-900/5 md:hidden"
        >
          <nav className="flex flex-col gap-2" aria-label="Navegação móvel">
            {landingNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-12 items-center rounded-2xl px-4 text-base font-bold text-slate-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                onClick={(event) => handleSectionLinkClick(event, link.href)}
              >
                {link.label}
              </Link>
            ))}
            {viewer ? null : (
              <Link
                href="/login"
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 text-base font-bold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                onClick={() => setOpen(false)}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Entrar
              </Link>
            )}
            <Link
              href={primaryCta.href}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-700 px-4 text-base font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              onClick={() => setOpen(false)}
            >
              {primaryCta.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
