import { LegalPage } from "@/components/marketing/legal-page";

export default function RefundPage() {
  return (
    <LegalPage
      title="Política de reembolso"
      sections={[
        ["Versão preliminar", "Este texto pode ser atualizado até a abertura das vendas. Avisaremos quando a versão final for publicada."],
        ["Arrependimento", "Compras online têm direito de arrependimento em até 7 dias após o pagamento, conforme a legislação aplicável."],
        ["Canal", "Solicitações de reembolso devem ser enviadas para suporte@nexoenem.com com o e-mail da conta e a identificação do pedido."],
        ["Análise", "A equipe verificará o status do pagamento, o prazo aplicável e as regras publicadas no checkout."],
        ["Forma de reembolso", "Quando aprovado, o reembolso é feito pelo mesmo meio de pagamento usado na compra."],
        ["Sem renovação automática", "O produto é de pagamento único; não há mensalidade nem cobrança recorrente."],
      ]}
    />
  );
}
