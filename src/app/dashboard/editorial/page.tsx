import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Notice } from "@/components/ui/notice";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { requirePlatformAccess } from "@/lib/db/queries";
import type { QuestionRecord } from "@/lib/db/types";
import { canEditEditorial } from "@/lib/editorial/rules.mjs";
import { EditorialClient } from "./editorial-client";

export const dynamic = "force-dynamic";

export default async function EditorialPage() {
  const { profile } = await requirePlatformAccess();
  const isAdmin = canEditEditorial(profile?.access_level);

  if (!isAdmin) {
    return (
      <div>
        <DashboardPageHeader
          title="Editorial"
          description="Area restrita para revisao, classificacao e aprovacao de questoes."
        />
        <Notice tone="warning">
          Esta area e restrita a administradores. Nenhuma questao foi carregada
          ou alterada.
        </Notice>
      </div>
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return (
      <div>
        <DashboardPageHeader
          title="Editorial"
          description="Area restrita para revisao, classificacao e aprovacao de questoes."
        />
        <Notice tone="warning">
          Configure SUPABASE_SERVICE_ROLE_KEY para carregar e salvar alteracoes
          editoriais com permissao administrativa.
        </Notice>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select(
      `
      *,
      subjects (*),
      topics (*),
      question_options (*),
      question_media (*)
    `,
    )
    .order("year", { ascending: false })
    .order("question_number", { ascending: true });

  return (
    <div>
      <DashboardPageHeader
        title="Editorial"
        description="Revise status, enunciado, alternativas, classificacao, resolucao e midia antes de importar ou publicar."
      />

      {error ? (
        <Notice tone="danger" className="mb-6">
          {error.message}
        </Notice>
      ) : null}

      <EditorialClient questions={(data ?? []) as unknown as QuestionRecord[]} />
    </div>
  );
}
