import { LegalPage } from "@/components/marketing/legal-page";

export default function RefundPage() {
  return (
    <LegalPage
      title="Política de reembolso"
      sections={[
        ["Status do texto", "Texto provisório para revisão jurídica antes da publicação comercial."],
        ["Arrependimento", "A política deve respeitar a legislação aplicável e precisa ser revisada juridicamente antes da venda."],
        ["Canal", "Solicitações de reembolso devem ser enviadas para suporte@nexoenem.com com e-mail da conta e identificação do pedido."],
        ["Análise", "A equipe verificará status do pagamento, uso da conta, prazo aplicável e regras finais publicadas no checkout."],
        ["Forma de reembolso", "Quando aprovado, o reembolso deve seguir o fluxo do provedor de pagamento usado na compra."],
        ["Sem renovação automática", "O produto é pagamento único; não há mensalidade ou cobrança recorrente nesta etapa."],
      ]}
    />
  );
}
