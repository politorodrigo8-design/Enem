import { LegalList, LegalPage } from "@/components/marketing/legal-page";
import { getLegalContactEmail, legalContacts, legalDocuments } from "@/lib/legal/config";

const privacyDocument = legalDocuments.privacy_policy;
const SUPPORT_EMAIL = legalContacts.supportEmail;
const PRIVACY_EMAIL = getLegalContactEmail();

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      documentLabel="Política de Privacidade do Pontua Enem"
      updatedAt={privacyDocument.updatedAtLabel}
      version={privacyDocument.version}
      effectiveAt={privacyDocument.effectiveAtLabel}
      notice="Leia antes de criar conta, contratar ou usar a plataforma."
      sections={[
        {
          id: "responsavel-escopo",
          heading: "Responsável e escopo",
          body: (
            <>
              <p>
                Esta Política explica como o Pontua Enem trata dados pessoais nas páginas
                públicas, cadastro, login, checkout, compras de créditos e áreas internas
                da plataforma.
              </p>
              <p>
                O canal operacional para solicitações de privacidade e suporte é{" "}
                <a className="font-semibold text-blue-700 hover:text-blue-800" href={`mailto:${PRIVACY_EMAIL}`}>
                  {PRIVACY_EMAIL}
                </a>
                .
              </p>
            </>
          ),
        },
        {
          id: "dados-tratados",
          heading: "Dados tratados",
          body: (
            <LegalList
              items={[
                "Dados de conta, como nome, e-mail, identificadores internos e autenticação.",
                "Dados de pedidos e pagamentos, como produto, valor, status, identificadores internos e identificadores limitados do Mercado Pago.",
                "Dados de estudo, como respostas, simulados, diagnóstico, desempenho, prioridades, favoritos, revisão de erros e plano semanal.",
                "Dados de redação, incluindo tema, observações, texto digitado, arquivos enviados, status, eventos da fila, correções e créditos debitados ou estornados.",
                "Dados de créditos, como saldo, consumo, compra, estorno, razão do lançamento e histórico em ledger.",
                "Dados de indicação, como código, usuários envolvidos por identificador interno, status da recompensa e pedido associado.",
                "Dados técnicos necessários, como cookies essenciais de autenticação e sessão, IP, navegador, dispositivo e logs gerados pela infraestrutura.",
                "Comunicações enviadas ao suporte e registros de aceite dos documentos legais.",
              ]}
            />
          ),
        },
        {
          id: "finalidades-bases",
          heading: "Finalidades e bases legais",
          body: (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pr-4">Finalidade</th>
                    <th>Base legal principal</th>
                  </tr>
                </thead>
                <tbody className="text-sm leading-6">
                  <PrivacyRow purpose="Cadastro e autenticação" basis="Execução do contrato e procedimentos preliminares." />
                  <PrivacyRow purpose="Fornecimento do serviço educacional" basis="Execução do contrato." />
                  <PrivacyRow purpose="Pedidos, pagamentos e créditos" basis="Execução contratual, obrigação legal e exercício regular de direitos, conforme o caso." />
                  <PrivacyRow purpose="Segurança, prevenção de fraude e logs" basis="Legítimo interesse, obrigação legal ou exercício de direitos." />
                  <PrivacyRow purpose="Suporte" basis="Execução contratual, legítimo interesse ou exercício de direitos." />
                  <PrivacyRow purpose="Registros de aceite" basis="Execução contratual, cumprimento de obrigação e exercício regular de direitos." />
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: "fornecedores",
          heading: "Fornecedores e compartilhamento",
          body: (
            <>
              <p>
                Dados podem ser tratados por fornecedores técnicos necessários à operação,
                sempre de acordo com suas funções no serviço.
              </p>
              <LegalList
                items={[
                  "Supabase: autenticação, banco de dados, armazenamento privado de redações, sessão e controle de acesso.",
                  "Vercel: hospedagem, infraestrutura, execução da aplicação e logs técnicos.",
                  "Mercado Pago: processamento de pagamentos, criação de checkout, confirmação, estorno e eventos de pagamento.",
                  "Groq: geração de respostas educacionais de IA para explicação de questões, análise de desempenho e plano inteligente.",
                  "Serviços de e-mail e suporte: envio de comunicações essenciais e atendimento, quando utilizados.",
                ]}
              />
            </>
          ),
        },
        {
          id: "ia-automacao",
          heading: "IA e tratamento automatizado",
          body: (
            <>
              <p>
                Explicações de questões, análises de desempenho e planos inteligentes podem
                ser produzidos total ou parcialmente por IA com finalidade educacional. As
                chamadas encontradas usam a Groq, por meio de API compatível com chat
                completions.
              </p>
              <p>
                Para explicação de questão, podem ser enviados enunciado, alternativas,
                gabarito, explicação editorial, área, disciplina, tópico, ano, fonte e a
                alternativa escolhida pelo usuário. Para análise de desempenho e plano
                inteligente, podem ser enviados métricas, respostas recentes, tópicos,
                prioridades, rotina de estudo, curso alvo e nota alvo quando informados.
              </p>
              <p>
                Nome e e-mail não são necessários para essas chamadas de IA. Redações não
                são enviadas à Groq pelo fluxo atual de correção. O processamento por
                fornecedores pode ocorrer fora do Brasil.
              </p>
              <p>
                Indicadores, prioridades, análises e recomendações podem ser produzidos
                total ou parcialmente de forma automatizada e possuem finalidade
                educacional. O usuário poderá solicitar informações sobre os critérios
                utilizados e contestar resultados que considere incorretos, quando
                aplicável.
              </p>
            </>
          ),
        },
        {
          id: "redacoes",
          heading: "Redações e dados sensíveis incidentais",
          body: (
            <>
              <p>
                As redações podem ser enviadas por texto digitado ou arquivo. Arquivos
                ficam em bucket privado do Supabase, com acesso por políticas de controle e
                URLs assinadas temporárias. O fluxo atual coloca a redação em fila para
                análise pela equipe de correção.
              </p>
              <p>
                Evite inserir na redação informações pessoais ou dados sensíveis seus ou de
                terceiros que não sejam necessários para a correção. Caso o conteúdo
                enviado contenha espontaneamente essas informações, elas serão tratadas
                somente para receber, processar, corrigir e devolver a redação, observadas
                as medidas de proteção aplicáveis.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          heading: "Cookies e tecnologias similares",
          body: (
            <p>
              O Pontua Enem utiliza cookies e tecnologias estritamente necessários à
              autenticação, manutenção da sessão, segurança e funcionamento da plataforma.
              Quando houver acesso por link de indicação, também podemos usar um cookie de
              atribuição por até 30 dias para preservar o código durante cadastro e
              checkout. Atualmente, não utilizamos cookies de publicidade comportamental ou
              pixels de marketing.
            </p>
          ),
        },
        {
          id: "transferencia-retencao",
          heading: "Transferência, retenção e eliminação",
          body: (
            <>
              <p>
                Supabase, Vercel, Mercado Pago, Groq e outros operadores técnicos podem
                processar dados fora do Brasil para autenticação, hospedagem, pagamentos,
                IA, suporte e segurança, conforme contratos, políticas e salvaguardas
                aplicáveis.
              </p>
              <LegalList
                items={[
                  "Conta, progresso, respostas e desempenho: enquanto a conta estiver ativa ou pelo período necessário à prestação do serviço.",
                  "Pedidos, pagamentos, créditos e registros de aceite: pelo período necessário à execução contratual, obrigações legais, auditoria e exercício de direitos.",
                  "Redações, arquivos e correções: enquanto necessários para entregar, revisar e manter o histórico da correção, salvo solicitação aplicável ou obrigação de retenção.",
                  "Suporte e logs: pelo período necessário para atendimento, segurança, prevenção de fraude, diagnóstico de falhas e exercício de direitos.",
                  "Backups: podem manter cópias por ciclo técnico limitado até sobrescrita ou eliminação conforme a infraestrutura.",
                ]}
              />
            </>
          ),
        },
        {
          id: "direitos",
          heading: "Direitos do titular",
          body: (
            <>
              <p>
                Você pode solicitar confirmação de tratamento, acesso, correção,
                anonimização, bloqueio, eliminação, portabilidade, informação sobre
                compartilhamento, revogação de consentimento, oposição e revisão ou
                esclarecimento sobre tratamento automatizado quando aplicável.
              </p>
              <p>
                Envie a solicitação para{" "}
                <a className="font-semibold text-blue-700 hover:text-blue-800" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                . Para proteger a conta, poderemos solicitar confirmação de identidade e
                observar limitações legais ou contratuais aplicáveis.
              </p>
            </>
          ),
        },
        {
          id: "menores",
          heading: "Crianças e adolescentes",
          body: (
            <p>
              O Pontua Enem é direcionado a estudantes e pode ser utilizado por
              adolescentes. O uso por menores de idade deve ocorrer com ciência e
              orientação do responsável legal, observando finalidade educacional,
              minimização de dados e o melhor interesse do menor.
            </p>
          ),
        },
        {
          id: "alteracoes-contato",
          heading: "Alterações e contato",
          body: (
            <p>
              Esta Política pode ser atualizada, com indicação de nova versão e data.
              Mudanças relevantes poderão exigir nova manifestação de ciência ou aceite no
              cadastro, checkout ou acesso à plataforma.
            </p>
          ),
        },
      ]}
    />
  );
}

function PrivacyRow({ purpose, basis }: { purpose: string; basis: string }) {
  return (
    <tr className="align-top">
      <td className="rounded-l-lg bg-slate-50 px-3 py-2 font-semibold text-slate-900">
        {purpose}
      </td>
      <td className="rounded-r-lg bg-slate-50 px-3 py-2 text-slate-600">{basis}</td>
    </tr>
  );
}
