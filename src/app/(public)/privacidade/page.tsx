import { LegalPage } from "@/components/marketing/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      sections={[
        ["Versão preliminar", "Este texto pode ser atualizado até a abertura das vendas. Avisaremos quando a versão final for publicada."],
        ["Dados de conta", "Podemos tratar nome, e-mail e informações de autenticação necessárias para acesso à plataforma."],
        ["Dados de estudo", "Respostas, simulados, diagnóstico, plano, desempenho e feedback podem ser usados para entregar e melhorar o serviço."],
        ["Pagamentos e reembolso", "Dados sensíveis de cartão não são armazenados pelo Pontua Enem. O processamento ocorre no provedor de pagamento. Para analisar pedidos de reembolso, podemos usar dados mínimos da compra, como e-mail da conta, identificação do pedido, status do pagamento e meio de pagamento utilizado."],
        ["Segurança", "Senhas e dados de cartão nunca são gravados em registros de uso da plataforma."],
        ["Contato", "Pedidos relacionados a privacidade podem ser enviados para suporte@pontuaenem.com.br."],
      ]}
    />
  );
}
