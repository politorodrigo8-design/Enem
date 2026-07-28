import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { footerLinks, supportEmail } from "./landing-data";

type LandingFooterProps = {
  supplierLines: Array<{ label: string; value: string }>;
};

export function LandingFooter({ supplierLines }: LandingFooterProps) {
  return (
    <footer className="border-t border-blue-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.1fr_1.5fr] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
            Uma plataforma para organizar prioridades, prática e evolução até o ENEM.
          </p>
          <p className="mt-4 text-sm font-bold text-slate-700">
            Suporte:{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="text-blue-700 underline-offset-4 hover:underline"
            >
              {supportEmail}
            </a>
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <nav aria-label="Links do rodapé">
            <p className="text-sm font-extrabold text-slate-950">Pontua Enem</p>
            <div className="mt-3 grid gap-1">
              {footerLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="inline-flex min-h-11 w-fit items-center rounded-[12px] text-sm font-semibold text-slate-600 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:min-h-0"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
          <div>
            <p className="text-sm font-extrabold text-slate-950">Aviso</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              O Pontua Enem não possui vínculo oficial com o Inep, com o MEC ou
              com os organizadores do ENEM.
            </p>
            {supplierLines.length > 0 ? (
              <dl className="mt-4 grid gap-2 text-sm leading-6 text-slate-600">
                {supplierLines.map((line) => (
                  <div key={line.label} className="flex flex-wrap gap-x-1.5">
                    <dt className="font-bold text-slate-700">{line.label}:</dt>
                    <dd className="min-w-0 break-words">{line.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
