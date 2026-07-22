import Link from "next/link";
import { PublicHeader } from "@/components/marketing/public-header";
import { Logo } from "@/components/ui/logo";
import { getProductCta } from "@/lib/services/billing";

const footerLinks = [
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Radar ENEM", href: "/#radar" },
  { label: "Preço", href: "/#precos" },
  { label: "Termos de uso", href: "/termos" },
  { label: "Política de privacidade", href: "/privacidade" },
  { label: "Reembolso", href: "/reembolso" },
  { label: "Contato", href: "mailto:suporte@pontuaenem.com.br" },
];

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cta = getProductCta();

  return (
    <>
      <PublicHeader cta={cta} />
      {children}
      <footer className="border-t border-white/10 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_2fr] lg:px-8">
          <div>
            <Logo variant="dark" />
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Preparação estratégica para estudantes que querem saber o que
              estudar, em que ordem, até a prova do ENEM.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-white">Institucional</p>
              <div className="mt-3 grid gap-2">
                {footerLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Aviso</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                A Pontua Enem não possui vínculo oficial com o Inep, com o MEC ou
                com organizadores do ENEM. As prioridades indicadas são
                estimativas educacionais, não previsão da prova.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
