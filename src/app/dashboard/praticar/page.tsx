import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getAccessContext } from "@/lib/access";
import {
  getProfile,
  getActivePracticeSession,
  getQuestionRecords,
  getReviewQuestions,
  getTopicNameById,
} from "@/lib/db/queries";
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
  }>;
}) {
  const [{ tab, question, topic }, questions, reviewQuestions, activePracticeSession, profile] =
    await Promise.all([
      searchParams,
      getQuestionRecords(),
      getReviewQuestions(),
      getActivePracticeSession("question_bank"),
      getProfile(),
    ]);

  // topic_id do banco vira nome do assunto: o filtro do cliente casa por nome,
  // o que inclui as questões do acervo local (tópicos com ids próprios).
  const initialTopic =
    topic && uuidPattern.test(topic)
      ? ((await getTopicNameById(topic)) ?? topic)
      : topic;

  const access = getAccessContext(profile);
  const initialTab: PracticeTab = tab === "revisao" ? tab : "banco";

  return (
    <div>
      <DashboardPageHeader
        title="Praticar"
        description="Resolva questões do banco verificado — a sessão já vem montada para você."
      />
      <PracticeTabs
        initialTab={initialTab}
        questions={questions}
        reviewQuestions={reviewQuestions}
        access={access}
        initialQuestionId={question}
        initialTopic={initialTopic}
        activePracticeSession={activePracticeSession}
      />
    </div>
  );
}
