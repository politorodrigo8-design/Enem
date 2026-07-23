import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";

export function LegalPage({
  title,
  documentLabel,
  updatedAt,
  version,
  effectiveAt,
  notice,
  sections,
}: {
  title: string;
  documentLabel: string;
  updatedAt: string;
  version?: string;
  effectiveAt?: string;
  notice: string;
  sections: Array<{ id: string; heading: string; body: React.ReactNode }>;
}) {
  return (
    <main className="bg-slate-50 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="animate-rise text-4xl font-display font-semibold tracking-tight text-slate-950">{title}</h1>
        <p
          className="animate-rise mt-4 text-base leading-7 text-slate-600"
          style={{ "--rise-delay": "70ms" } as React.CSSProperties}
        >
          {documentLabel} · Versão: {version ?? updatedAt} · Última atualização:{" "}
          {updatedAt}
          {effectiveAt ? ` · Vigência: ${effectiveAt}` : ""}. {notice}
        </p>
        <Reveal delay={140}>
          <Card className="mt-8">
            <CardContent className="p-6 sm:p-8">
              <nav aria-label="Sumário" className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">Sumário</p>
                <ol className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2">
                  {sections.map((section, index) => (
                    <li key={section.id}>
                      <a
                        className="flex min-h-11 items-center rounded-md px-2 py-2 hover:bg-white hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        href={`#${section.id}`}
                      >
                        {index + 1}. {section.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              <div className="mt-8 space-y-9">
                {sections.map((section, index) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="text-lg font-bold text-slate-950">
                      {index + 1}. {section.heading}
                    </h2>
                    <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                      {section.body}
                    </div>
                  </section>
                ))}
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </main>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
