import { LegalList, LegalPage } from "@/components/marketing/legal-page";
import { legalContacts, legalDocuments } from "@/lib/legal/config";

const refundDocument = legalDocuments.refund_policy;
const SUPPORT_EMAIL = legalContacts.supportEmail;

export default function RefundPage() {
  return (
    <LegalPage
      title="Política de reembolso"
      documentLabel="Política de Reembolso do Pontua Enem"
      updatedAt={refundDocument.updatedAtLabel}
      version={refundDocument.version}
      effectiveAt={refundDocument.effectiveAtLabel}
      notice="Leia antes de contratar o acesso."
      sections={[
        {
          id: "objetivo",
          heading: "Objetivo e aplicação",
          body: (
            <p>
              Esta Política se aplica às compras do Pontua Enem realizadas pelos canais
              oficiais da plataforma.
            </p>
          ),
        },
        {
          id: "arrependimento",
          heading: "Direito de arrependimento",
          body: (
            <p>
              Nas compras realizadas pela internet, o consumidor poderá exercer o direito
              de arrependimento no prazo legal de 7 dias, contado na forma da legislação
              aplicável, sem necessidade de apresentar justificativa.
            </p>
          ),
        },
        {
          id: "solicitacao",
          heading: "Como solicitar",
          body: (
            <>
              <p>
                Envie a solicitação para{" "}
                <a className="font-semibold text-blue-700 hover:text-blue-800" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
              <LegalList
                items={[
                  "E-mail da conta.",
                  "Identificação da transação ou pedido, se disponível.",
                  "Data da compra.",
                  "Informações necessárias para localizar o pagamento.",
                  "Motivo, de forma opcional quando a solicitação estiver dentro do direito de arrependimento.",
                ]}
              />
            </>
          ),
        },
        {
          id: "confirmacao-prazos",
          heading: "Confirmação e prazos",
          body: (
            <p>
              Após a confirmação da identidade, da compra e do recebimento da solicitação
              dentro do prazo aplicável, o reembolso será encaminhado pelo fluxo disponível
              no Mercado Pago ou pelo meio de pagamento utilizado. O prazo para visualização
              do valor pode depender do Mercado Pago, banco, bandeira ou meio de pagamento.
            </p>
          ),
        },
        {
          id: "forma",
          heading: "Forma de devolução",
          body: (
            <p>
              A devolução normalmente ocorre pelo mesmo meio de pagamento usado na compra,
              conforme os procedimentos do Mercado Pago e das instituições financeiras
              envolvidas.
            </p>
          ),
        },
        {
          id: "acesso-creditos",
          heading: "Acesso e créditos internos",
          body: (
            <>
              <p>
                O acesso à plataforma pode ser encerrado após a confirmação do reembolso.
                Créditos internos concedidos com o produto principal, comprados
                separadamente ou promocionais podem ser ajustados no saldo e no histórico,
                sem reduzir direitos legais do consumidor.
              </p>
              <p>
                Créditos já consumidos serão analisados conforme o caso, especialmente em
                direito de arrependimento, falha técnica, débito indevido, cobrança
                duplicada, créditos pagos e não entregues ou pagamento aprovado sem
                liberação. Em caso de falha técnica que gere débito indevido, o histórico
                poderá ser corrigido por estorno de créditos.
              </p>
            </>
          ),
        },
        {
          id: "problemas-pagamento",
          heading: "Cobrança duplicada ou falha de pagamento",
          body: (
            <p>
              Em caso de duplicidade, cobrança não reconhecida, pagamento aprovado sem
              liberação de acesso, créditos pagos e não entregues, falha de processamento
              ou débito indevido de créditos, entre em contato pelo suporte para que o
              pedido seja localizado e tratado junto ao provedor quando necessário.
            </p>
          ),
        },
        {
          id: "chargeback",
          heading: "Chargeback",
          body: (
            <p>
              Quando possível, recomendamos procurar o suporte antes de abrir contestação
              no meio de pagamento, para que possamos localizar e resolver o problema. Isso
              não impede o exercício de direitos junto ao banco, bandeira ou provedor de
              pagamento.
            </p>
          ),
        },
        {
          id: "renovacao-direitos",
          heading: "Renovação e direitos legais",
          body: (
            <p>
              O produto atual é de pagamento único, sem mensalidade e sem renovação
              automática. Esta Política não limita nem exclui direitos previstos em lei.
            </p>
          ),
        },
        {
          id: "contato",
          heading: "Contato",
          body: (
            <p>
              Canal oficial para reembolso e suporte:{" "}
              <a className="font-semibold text-blue-700 hover:text-blue-800" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
