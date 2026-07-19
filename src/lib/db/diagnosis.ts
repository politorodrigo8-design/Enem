import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePriorityScore } from "@/lib/db/scoring";

/**
 * Recalcula o priority_score de todos os tópicos a partir da autopercepção
 * de dificuldade por área. Usado tanto ao concluir o onboarding quanto ao
 * refazer o diagnóstico — os dois fluxos produzem o mesmo resultado.
 */
export async function recalculateDiagnosisPriorities(
  supabase: SupabaseClient,
  userId: string,
  perceivedDifficulties: Record<string, number | string>,
) {
  const { data: topics } = await supabase.from("topics").select("*, subjects (*)");
  const upserts =
    topics?.map((topic) => {
      const areaDifficulty = Number(
        perceivedDifficulties[(topic.subjects as { area: string }).area] ?? 3,
      );
      const score =
        calculatePriorityScore(topic, undefined) +
        Number((areaDifficulty * 1.2).toFixed(2));

      return {
        user_id: userId,
        topic_id: topic.id,
        priority_score: score,
      };
    }) ?? [];

  if (upserts.length) {
    await supabase
      .from("user_topic_performance")
      .upsert(upserts, { onConflict: "user_id,topic_id" });
  }
}
