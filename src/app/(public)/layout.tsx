import Link from "next/link";
import { PublicHeader } from "@/components/marketing/public-header";
import { Logo } from "@/components/ui/logo";

const footerLinks = [
  "Como funciona",
  "Radar ENEM",
  "Preços",
  "Termos de uso",
  "Política de privacidade",
  "Contato",
];

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <PublicHeader />
      {children}
      <footer className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_2fr] lg:px-8">
          <div>
            <Logo className="text-white" />
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Preparação estratégica e demonstrativa para estudantes que querem
              organizar melhor o estudo para o ENEM.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-white">Institucional</p>
              <div className="mt-3 grid gap-2">
                {footerLinks.map((link) => (
                  <Link
                    key={link}
                    href={link.includes("Radar") ? "/#radar" : "/#"}
                    className="text-sm text-slate-300 hover:text-white"
                  >
                    {link}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Aviso</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                A NexoENEM não possui vínculo oficial com o Inep, com o MEC ou
                com organizadores do ENEM. As prioridades desta versão são
                estimativas educacionais com dados demonstrativos.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
