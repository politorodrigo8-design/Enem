import { LegalPage } from "@/components/marketing/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      sections={[
        ["Versão preliminar", "Este texto pode ser atualizado até a abertura das vendas. Avisaremos quando a versão final for publicada."],
        ["Dados de conta", "Podemos tratar nome, e-mail e informações de autenticação necessárias para acesso à plataforma."],
        ["Dados de estudo", "Respostas, simulados, diagnóstico, plano, desempenho e feedback podem ser usados para entregar e melhorar o serviço."],
        ["Pagamentos", "Dados sensíveis de cartão não são armazenados pelo NexoENEM. O processamento ocorre no provedor de pagamento."],
        ["Segurança", "Senhas e dados de cartão nunca são gravados em registros de uso da plataforma."],
        ["Contato", "Pedidos relacionados a privacidade podem ser enviados para suporte@nexoenem.com."],
      ]}
    />
  );
}
