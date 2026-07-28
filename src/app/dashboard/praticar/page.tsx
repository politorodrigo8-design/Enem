import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getAccessContext } from "@/lib/access";
import {
  getProfile,
  getActivePracticeSession,
  getQuestionRecords,
  getTopicNameById,
  getTopicsWithPerformance,
} from "@/lib/db/queries";
import { withCleanStatements } from "@/lib/questions/quality";
import { prioritizeTopics } from "@/lib/study/priorities";
import { PracticeTabs, type PracticeTab } from "./practice-tabs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    question?: string;
    topic?: string;
    meta?: string;
  }>;
}) {
  const [{ tab, question, topic, meta }, questions, activePracticeSession, profile, topics] =
    await Promise.all([
      searchParams,
      getQuestionRecords(),
      getActivePracticeSession("question_bank"),
      getProfile(),
      getTopicsWithPerformance(),
    ]);

  // topic_id do banco vira nome do assunto: o filtro do cliente casa por nome,
  // o que inclui as questões do acervo local (tópicos com ids próprios).
  const initialTopic =
    topic && uuidPattern.test(topic)
      ? ((await getTopicNameById(topic)) ?? topic)
      : topic;

  const access = getAccessContext(profile);
  const initialTab: PracticeTab = tab === "revisao" ? tab : "banco";

  // Mesma priorização de assuntos que a tela Hoje usa: é ela que define quais
  // assuntos entram em "Recomendadas" e o critério exibido ao aluno.
  const topicPriority = Object.fromEntries(
    prioritizeTopics(topics).map((item) => [
      item.topic.name,
      {
        score: item.score,
        reason: item.reason,
        hasPerformance: item.hasPersonalPerformance,
      },
    ]),
  );

  return (
    <div>
      <DashboardPageHeader
        title="Questões"
        description="Banco de questões verificado, com recomendadas, filtros e revisão das já respondidas."
      />
      <PracticeTabs
        initialTab={initialTab}
        questions={withCleanStatements(questions)}
        access={access}
        userId={profile?.id ?? ""}
        initialQuestionId={question}
        initialTopic={initialTopic}
        initialGoal={parseGoal(meta)}
        topicPriority={topicPriority}
        activePracticeSession={activePracticeSession}
      />
    </div>
  );
}

// A meta do dia chega pela URL quando o aluno entra pelo botão da tela Hoje.
function parseGoal(value?: string) {
  const goal = Number(value);
  if (!Number.isFinite(goal)) return null;
  return goal >= 5 && goal <= 50 ? Math.floor(goal) : null;
}
