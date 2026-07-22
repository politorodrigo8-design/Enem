import { LegalPage } from "@/components/marketing/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      sections={[
        ["Versão preliminar", "Este texto pode ser atualizado até a abertura das vendas. Avisaremos quando a versão final for publicada."],
        ["Produto", "O Pontua Enem Completo é uma plataforma de estudos para o ENEM com pagamento único e acesso pelo prazo informado no checkout."],
        ["Sem garantia de resultado", "A plataforma organiza estudos e desempenho, mas não promete aprovação, nota garantida, previsão exata, questão certa ou tema confirmado."],
        ["Acesso", "O acesso à plataforma é liberado após a confirmação do pagamento."],
        ["Reembolso", "Compras online podem ter direito de arrependimento em até 7 dias após o pagamento, conforme a legislação aplicável. Solicitações devem ser enviadas para suporte@pontuaenem.com.br com o e-mail da conta e a identificação do pedido. Quando aprovado, o reembolso é feito pelo mesmo meio de pagamento usado na compra."],
        ["Estimativas educacionais", "Indicadores como o Radar ENEM são estimativas educacionais e aparecem identificados como tal na plataforma."],
        ["Contato", "Solicitações podem ser enviadas para suporte@pontuaenem.com.br."],
      ]}
    />
  );
}
