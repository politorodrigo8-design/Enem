import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import logoLightBg from "../../../public/pontuaenem-logo-for-light-bg.png";
import logoDarkBg from "../../../public/pontuaenem-logo-for-dark-bg.png";

export function Logo({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center", className)}
      aria-label="Pontua Enem - página inicial"
    >
      <Image
        src={variant === "dark" ? logoDarkBg : logoLightBg}
        alt="Pontua Enem"
        priority
        className="h-8 w-auto"
      />
    </Link>
  );
}
