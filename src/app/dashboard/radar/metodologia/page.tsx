import Link from "next/link";
import { ArrowLeft, Database, FileText, ShieldAlert } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Reveal } from "@/components/ui/reveal";
import { getRadarMethodologyVersions } from "@/lib/db/queries";

const rules = [
  "Recorrência histórica não significa previsão exata.",
  "Prioridades são estimativas educacionais.",
  "Desempenho pessoal influencia a recomendação.",
  "O NexoENEM não possui vínculo oficial com MEC ou Inep.",
  "Questões e dados de exemplo aparecem sempre identificados.",
  "Nenhuma nota específica é garantida.",
  "Questões prioritárias podem não ter conteúdo semelhante na prova seguinte.",
  "A metodologia pode ser atualizada com novos dados.",
];

const weights = [
  ["Recorrência histórica do conteúdo", "historical_recurrence_weight"],
  ["Frequência da habilidade", "skill_frequency_weight"],
  ["Ocorrência em provas recentes", "recent_exam_weight"],
  ["Taxa de erro do aluno", "user_error_rate_weight"],
  ["Nota-alvo", "target_score_weight"],
  ["Confiança editorial", "editorial_confidence_weight"],
];

export default async function RadarMethodologyPage() {
  const versions = await getRadarMethodologyVersions();

  return (
    <div>
      <DashboardPageHeader
        title="Metodologia do Radar"
        description="Critérios transparentes usados para organizar recorrência, prioridade e treino — sem promessa de previsão exata."
        action={
          <Link href="/dashboard/radar" className={buttonClasses({ variant: "outline" })}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao Radar
          </Link>
        }
      />

      <Notice tone="warning" className="mb-6" icon={ShieldAlert}>
        As indicações de recorrência são estimativas baseadas em histórico e padrões
        de cobrança. Não representam previsão exata do conteúdo da prova.
      </Notice>

      <Reveal delay={80}>
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>O que o Radar não faz</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <li key={rule} className="flex gap-3 py-2.5">
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <p className="text-sm leading-6 text-slate-700">{rule}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pontuação interna de prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">
              A seleção do treino de alta prioridade usa uma soma de pesos
              documentados. O cálculo é uma regra operacional para ordenar estudos,
              não uma ciência exata.
            </p>
            <ol className="mt-4 divide-y divide-slate-100">
              {weights.map(([label, key], index) => (
                <li key={key} className="flex items-center gap-3 py-2.5">
                  <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-xs font-semibold text-blue-700">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium leading-6 text-slate-800">{label}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>
      </Reveal>

      <Reveal delay={140}>
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Versões cadastradas</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {versions.length ? (
              <div className="divide-y divide-slate-100">
                {versions.map((version) => (
                  <div key={version.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-950">
                        {version.methodology_version}
                      </p>
                      <Badge tone={version.is_demo ? "amber" : "green"}>
                        {version.is_demo ? "Versão de exemplo" : "Revisada"}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                      <Detail label="Fonte" value={version.source} />
                      <Detail label="Período" value={version.analyzed_period || "Não informado"} />
                      <Detail label="Provas" value={String(version.exam_count)} />
                      <Detail label="Questões" value={String(version.question_count)} />
                      <Detail
                        label="Atualização"
                        value={new Date(version.last_updated_at).toLocaleDateString("pt-BR")}
                      />
                      <Detail label="Responsável" value={version.reviewed_by || "Não informado"} />
                    </dl>
                    {version.notes ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{version.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Nenhuma versão metodológica revisada foi cadastrada ainda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso de questões oficiais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-700">
                Antes de reproduzir uma questão oficial antiga, a plataforma deve verificar
                fonte do Inep, atribuição, integridade do enunciado, imagens, gabarito,
                acessibilidade e direitos de textos de terceiros. Se não for seguro
                reproduzir integralmente, apenas metadados, referência, comentário próprio
                e link oficial serão armazenados.
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <Database className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-700">
                Questões não revisadas não aparecem como alta prioridade. Para as
                categorias altas, exigimos fonte verificada, gabarito conferido,
                revisão aprovada, justificativa e nível de confiança registrado.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
      </Reveal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="tnum truncate text-right text-xs font-semibold text-slate-800">
        {value}
      </dd>
    </div>
  );
}
