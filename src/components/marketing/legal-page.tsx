import { Card, CardContent } from "@/components/ui/card";

export function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: Array<[string, string]>;
}) {
  return (
    <main className="bg-slate-50 py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Versão preliminar. A versão final será publicada antes da abertura das vendas.
        </p>
        <Card className="mt-8">
          <CardContent className="space-y-7 p-8">
            {sections.map(([heading, body]) => (
              <section key={heading}>
                <h2 className="text-lg font-bold text-slate-950">{heading}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
