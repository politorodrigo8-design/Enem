import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
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

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "Pontua Enem | Preparação estratégica para o ENEM",
    template: "%s | Pontua Enem",
  },
  description:
    "Descubra o que estudar para aumentar sua nota no ENEM: diagnóstico, Radar de prioridades, banco de questões e plano semanal de estudos.",
  applicationName: "Pontua Enem",
  keywords: ["ENEM", "estudos", "simulado", "desempenho", "plano de estudos"],
  openGraph: {
    title: "Pontua Enem",
    description:
      "Descubra o que estudar para aumentar sua nota no ENEM com diagnóstico, prioridades e plano semanal.",
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
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
