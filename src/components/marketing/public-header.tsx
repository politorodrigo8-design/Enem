"use client";

import Link from "next/link";
import { Menu, X, ArrowRight, LogIn } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const links = [
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Radar ENEM", href: "/#radar" },
  { label: "Preço", href: "/#precos" },
];

type PublicHeaderProps = {
  cta: {
    href: string;
    label: string;
  };
};

export function PublicHeader({ cta }: PublicHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 md:backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-10 items-center rounded-md px-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={buttonClasses({ variant: "ghost", size: "md" })}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Entrar
          </Link>
          <Link
            href={cta.href}
            className={buttonClasses({ variant: "primary", size: "md" })}
          >
            {cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2" aria-label="Navegação móvel">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className={buttonClasses({ variant: "outline", size: "md", full: true, className: "mt-2" })}
              onClick={() => setOpen(false)}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Entrar
            </Link>
            <Link
              href={cta.href}
              className={buttonClasses({ variant: "primary", size: "md", full: true })}
              onClick={() => setOpen(false)}
            >
              {cta.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
