import { LegalPage } from "@/components/marketing/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      sections={[
        ["Status do texto", "Texto provisório para revisão jurídica antes da publicação comercial."],
        ["Produto", "O NexoENEM Completo é uma plataforma de estudos para o ENEM com pagamento único e acesso pelo prazo informado no checkout."],
        ["Sem garantia de resultado", "A plataforma organiza estudos e desempenho, mas não promete aprovação, nota garantida, previsão exata, questão certa ou tema confirmado."],
        ["Acesso", "O dashboard é liberado apenas após pagamento aprovado pelo gateway ou liberação administrativa."],
        ["Conteúdo demonstrativo", "Enquanto o lançamento não estiver pronto, dados demonstrativos devem permanecer identificados como demonstrativos."],
        ["Contato", "Solicitações podem ser enviadas para suporte@nexoenem.com."],
      ]}
    />
  );
}
