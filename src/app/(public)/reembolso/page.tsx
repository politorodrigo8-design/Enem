import { LegalList, LegalPage } from "@/components/marketing/legal-page";

const SUPPORT_EMAIL = "suporte@pontuaenem.com.br";
const UPDATED_AT = "22 de julho de 2026";

export default function RefundPage() {
  return (
    <LegalPage
      title="Política de reembolso"
      documentLabel="Política de Reembolso do Pontua Enem"
      updatedAt={UPDATED_AT}
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
              Compras online podem ter direito de arrependimento em até 7 dias, contado
              conforme a legislação aplicável. O exercício desse direito dentro do prazo
              legal não exige justificativa.
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
              Após receber a solicitação, verificaremos os dados, o status do pagamento e
              a hipótese legal ou contratual aplicável. Confirmado o enquadramento da
              solicitação, o reembolso será processado pelo fluxo disponível no Mercado
              Pago ou no meio de pagamento utilizado, sujeito aos prazos do provedor,
              banco ou bandeira.
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
                Créditos internos concedidos com o acesso podem ser cancelados ou
                ajustados, sem reduzir direitos legais do consumidor.
              </p>
              <p>
                Em caso de falha técnica que gere débito indevido de créditos, o histórico
                poderá ser corrigido conforme as regras do serviço.
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
              liberação de acesso ou falha de processamento, entre em contato pelo suporte
              para que o pedido seja localizado e tratado junto ao provedor quando
              necessário.
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
