"use client";

import Link from "next/link";
import { type MouseEvent } from "react";

type LandingSectionLinkProps = {
  children: React.ReactNode;
  className?: string;
  href: `/#${string}`;
};

export function LandingSectionLink({
  children,
  className,
  href,
}: LandingSectionLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== "/") return;

    const hash = href.slice(2);
    const target = document.getElementById(hash);
    if (!target) return;

    event.preventDefault();
    if (window.location.hash !== `#${hash}`) {
      window.history.pushState(null, "", `#${hash}`);
    }
    target.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
