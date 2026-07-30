import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TikTokPixel } from "@/components/analytics/tiktok-pixel";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "Pontua Enem | Saiba o que estudar e organize sua preparação",
    template: "%s | Pontua Enem",
  },
  description:
    "Descubra suas prioridades, pratique com questões e simulados, envie redações e acompanhe sua evolução até o ENEM.",
  applicationName: "Pontua Enem",
  keywords: ["ENEM", "estudos", "simulado", "desempenho", "plano de estudos"],
  openGraph: {
    title: "Pontua Enem",
    description:
      "Descubra suas prioridades, pratique com questões e simulados, envie redações e acompanhe sua evolução até o ENEM.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Offsets descem o toaster para baixo do header de 64px (no mobile ele
            ocupa a faixa inteira e cobriria o botão de menu e o menu da conta). */}
        <Toaster
          richColors
          position="top-right"
          offset={{ top: "5rem" }}
          mobileOffset={{ top: "4.5rem", left: "1rem", right: "1rem" }}
        />
        <TikTokPixel />
      </body>
    </html>
  );
}
