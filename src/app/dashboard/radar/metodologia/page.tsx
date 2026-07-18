import Link from "next/link";
import { ArrowLeft, Database, FileText, ShieldAlert } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { getRadarMethodologyVersions } from "@/lib/db/queries";

const rules = [
  "Recorrência histórica não significa previsão exata.",
  "Prioridades são estimativas educacionais.",
  "Desempenho pessoal influencia a recomendação.",
  "O NexoENEM não possui vínculo oficial com MEC ou Inep.",
  "Dados demonstrativos devem aparecer identificados.",
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
        description="Critérios usados para organizar recorrência, prioridade e treino sem previsão exata, IA ou TRI real."
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

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>O que o Radar não faz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rules.map((rule) => (
              <div key={rule} className="flex gap-3">
                <div className="mt-2 h-2 w-2 rounded-md bg-blue-700" />
                <p className="text-sm leading-6 text-slate-700">{rule}</p>
              </div>
            ))}
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
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {weights.map(([label, key]) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <Badge tone="blue">{key}</Badge>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Versões cadastradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {versions.length ? (
              versions.map((version) => (
                <div key={version.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={version.is_demo ? "amber" : "green"}>
                      {version.is_demo ? "Dado demonstrativo" : "Revisado"}
                    </Badge>
                    <p className="text-sm font-bold text-slate-950">
                      {version.methodology_version}
                    </p>
                  </div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
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
                    <p className="mt-4 text-sm leading-6 text-slate-600">{version.notes}</p>
                  ) : null}
                </div>
              ))
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
              <FileText className="mt-0.5 h-5 w-5 text-violet-600" aria-hidden="true" />
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
                Questões não revisadas não podem aparecer como alta prioridade. A migration
                exige fonte verificada, gabarito verificado, revisão aprovada, justificativa
                e nível de confiança para categorias altas.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-6 text-slate-800">{value}</dd>
    </div>
  );
}
