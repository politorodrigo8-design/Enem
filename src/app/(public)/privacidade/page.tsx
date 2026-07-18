import { LegalPage } from "@/components/marketing/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      sections={[
        ["Status do texto", "Texto provisório para revisão jurídica antes da publicação comercial."],
        ["Dados de conta", "Podemos tratar nome, e-mail e informações de autenticação necessárias para acesso à plataforma."],
        ["Dados de estudo", "Respostas, simulados, diagnóstico, plano, desempenho e feedback podem ser usados para entregar e melhorar o serviço."],
        ["Pagamentos", "Dados sensíveis de cartão não são armazenados pelo NexoENEM. O processamento ocorre no provedor de pagamento configurado."],
        ["Segurança", "Tokens, senhas, CVV e chaves privadas não devem ser registrados em eventos de produto."],
        ["Contato", "Pedidos relacionados a privacidade podem ser enviados para suporte@nexoenem.com."],
      ]}
    />
  );
}
