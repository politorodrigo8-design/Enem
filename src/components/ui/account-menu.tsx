"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/actions/auth";

export type AccountMenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export function AccountMenu({
  fullName,
  email,
  profilePhotoUrl,
  items = [],
}: {
  fullName: string;
  email: string;
  profilePhotoUrl: string;
  items?: AccountMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

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
        <Avatar initials={initials} profilePhotoUrl={profilePhotoUrl} />
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
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                >
                  <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
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

function Avatar({
  initials,
  profilePhotoUrl,
}: {
  initials: string;
  profilePhotoUrl: string;
}) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-700 text-sm font-bold text-white">
      {profilePhotoUrl ? (
        <Image
          src={profilePhotoUrl}
          alt="Foto de perfil"
          width={36}
          height={36}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        initials || "NE"
      )}
    </span>
  );
}
