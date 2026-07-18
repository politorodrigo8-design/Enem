import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NexoENEM | Preparação estratégica para o ENEM",
    template: "%s | NexoENEM",
  },
  description:
    "Plataforma web para priorizar estudos do ENEM com diagnóstico, Radar ENEM, banco de questões e plano estratégico demonstrativo.",
  applicationName: "NexoENEM",
  keywords: ["ENEM", "estudos", "simulado", "desempenho", "plano de estudos"],
  openGraph: {
    title: "NexoENEM",
    description:
      "Descubra o que estudar para aumentar sua nota no ENEM com estratégia e dados demonstrativos.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
