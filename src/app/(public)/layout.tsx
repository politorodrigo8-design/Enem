import Link from "next/link";
import { PublicHeader } from "@/components/marketing/public-header";
import { Logo } from "@/components/ui/logo";
import { RevealController } from "@/components/ui/reveal-controller";
import { getPublicViewer } from "@/lib/db/queries";
import { getSupplierIdentificationLines } from "@/lib/legal/config";
import { getProductCta } from "@/lib/services/billing";

const footerLinks = [
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Desempenho", href: "/#desempenho" },
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
  const viewer = await getPublicViewer();
  const supplierLines = getSupplierIdentificationLines();

  return (
    <>
      <RevealController />
      <PublicHeader cta={cta} viewer={viewer} />
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
              <div className="mt-3 grid gap-0.5 sm:gap-2">
                {footerLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="inline-flex min-h-11 w-fit items-center text-sm text-slate-300 transition-colors hover:text-white sm:min-h-0"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Aviso</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                O Pontua Enem não possui vínculo oficial com o Inep, com o MEC
                ou com os organizadores do ENEM. As prioridades indicadas são
                estimativas educacionais e não representam previsão da prova.
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <dl className="mx-auto grid max-w-7xl gap-x-8 gap-y-1 px-4 py-6 text-sm leading-6 text-slate-400 sm:px-6 md:grid-cols-2 lg:px-8">
            {supplierLines.map((line) => (
              <div key={line.label} className="flex flex-wrap gap-x-1.5">
                <dt className="font-semibold text-slate-300">{line.label}:</dt>
                <dd className="min-w-0 break-words">{line.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </footer>
    </>
  );
}
