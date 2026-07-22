import { LegalList, LegalPage } from "@/components/marketing/legal-page";

const SUPPORT_EMAIL = "suporte@pontuaenem.com.br";
const UPDATED_AT = "22 de julho de 2026";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidade"
      documentLabel="Política de Privacidade do Pontua Enem"
      updatedAt={UPDATED_AT}
      notice="Leia antes de criar conta, contratar ou usar a plataforma."
      sections={[
        {
          id: "responsavel-escopo",
          heading: "Responsável e escopo",
          body: (
            <>
              <p>
                Esta Política explica como o Pontua Enem trata dados pessoais nas páginas
                públicas, cadastro, login, checkout e áreas internas da plataforma.
              </p>
              <p>
                O projeto ainda está em fase inicial. A identificação institucional e as
                responsabilidades formais de privacidade devem ser revisadas juridicamente
                antes da abertura de vendas comerciais definitivas. O canal operacional de
                privacidade é {SUPPORT_EMAIL}.
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
                "Dados de conta, como nome, e-mail, identificadores internos e autenticação processada pelo provedor.",
                "Dados de acesso, pagamento e pedidos, como status, identificação da transação e meio de pagamento limitado.",
                "Dados de estudo, como respostas, diagnóstico, simulados, desempenho, planos, favoritos e revisão.",
                "Dados de redação, incluindo texto digitado, arquivos enviados, status, correções e eventos da submissão.",
                "Dados de créditos, como saldo, consumo, estornos e histórico.",
                "Dados técnicos necessários ao funcionamento, como cookies essenciais de autenticação, IP, navegador, dispositivo e logs quando gerados pela infraestrutura.",
                "Comunicações enviadas ao suporte.",
              ]}
            />
          ),
        },
        {
          id: "dados-nao-armazenados",
          heading: "Dados não armazenados diretamente",
          body: (
            <>
              <p>
                Dados completos de cartão são processados pelo Mercado Pago, conforme o
                fluxo de pagamento. O Pontua Enem não armazena diretamente esses dados.
              </p>
              <p>
                A autenticação é processada pelo Supabase. A plataforma não precisa acessar
                senha em texto simples para operar o serviço.
              </p>
            </>
          ),
        },
        {
          id: "finalidades",
          heading: "Finalidades",
          body: (
            <LegalList
              items={[
                "Criar, proteger e autenticar contas.",
                "Liberar acesso, processar pagamento e manter registros de pedidos.",
                "Executar funcionalidades de estudo, diagnóstico, simulados, Radar ENEM, desempenho e plano semanal.",
                "Receber redações, acompanhar status, entregar correções e administrar créditos.",
                "Prestar suporte, corrigir falhas, prevenir fraude e cumprir obrigações legais.",
                "Enviar comunicações essenciais sobre conta, acesso, pagamento, segurança e funcionamento do serviço.",
              ]}
            />
          ),
        },
        {
          id: "bases-legais",
          heading: "Bases legais",
          body: (
            <p>
              O tratamento pode se apoiar em execução de contrato, cumprimento de obrigação
              legal, exercício regular de direitos, legítimo interesse para segurança,
              suporte e melhoria do serviço, e consentimento quando ele for necessário para
              uma finalidade específica.
            </p>
          ),
        },
        {
          id: "compartilhamento",
          heading: "Compartilhamento",
          body: (
            <>
              <p>
                Dados podem ser tratados por fornecedores técnicos necessários à operação,
                como Supabase, Vercel, Mercado Pago, serviços de e-mail e prestadores que
                auxiliem suporte, infraestrutura, segurança ou correção de falhas.
              </p>
              <p>
                Também pode haver compartilhamento com autoridades quando exigido por lei,
                ordem válida ou para exercício regular de direitos.
              </p>
            </>
          ),
        },
        {
          id: "transferencia-retencao",
          heading: "Transferência, retenção e eliminação",
          body: (
            <>
              <p>
                Provedores de infraestrutura podem processar dados fora do Brasil conforme
                seus contratos, configurações e medidas de proteção.
              </p>
              <p>
                Os dados são mantidos pelo tempo necessário para conta, contrato, suporte,
                segurança, prevenção de fraude, obrigações legais, exercício de direitos e
                backups. Quando aplicável, dados podem ser eliminados ou anonimizados.
              </p>
            </>
          ),
        },
        {
          id: "seguranca-incidentes",
          heading: "Segurança e incidentes",
          body: (
            <>
              <p>
                Usamos medidas como autenticação, controle de acesso, Row Level Security no
                banco, armazenamento privado de redações, URLs temporárias para arquivos,
                criptografia em trânsito e restrição de privilégios.
              </p>
              <p>
                Nenhum sistema é absolutamente seguro. Incidentes serão avaliados e
                comunicados quando exigido pela legislação aplicável.
              </p>
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
                compartilhamento, revogação de consentimento, oposição e revisão de
                decisões automatizadas quando aplicável.
              </p>
              <p>
                Para proteger sua conta, poderemos pedir confirmação de identidade antes de
                atender solicitações.
              </p>
            </>
          ),
        },
        {
          id: "menores",
          heading: "Crianças e adolescentes",
          body: (
            <p>
              Como a plataforma pode ser usada por estudantes menores de idade, o uso deve
              ocorrer com ciência ou assistência do responsável legal, conforme aplicável.
              Mecanismos específicos de consentimento parental devem ser revisados técnica
              e juridicamente antes de vendas comerciais definitivas.
            </p>
          ),
        },
        {
          id: "cookies-ia",
          heading: "Cookies, armazenamento e IA",
          body: (
            <>
              <p>
                O projeto usa cookies essenciais de autenticação e sessão relacionados ao
                Supabase. Não foi identificado no código uso de analytics, pixels de
                marketing ou cookies publicitários.
              </p>
              <p>
                Indicadores, prioridades e recomendações podem ser automatizados, mas têm
                finalidade educacional. O projeto não identificou decisões automatizadas
                com efeito jurídico relevante sobre o usuário.
              </p>
            </>
          ),
        },
        {
          id: "alteracoes-contato",
          heading: "Alterações e contato",
          body: (
            <>
              <p>
                Esta Política pode ser atualizada, com indicação da nova data de
                atualização. Mudanças relevantes serão comunicadas quando aplicável.
              </p>
              <p>
                Canal de privacidade e suporte:{" "}
                <a className="font-semibold text-blue-700 hover:text-blue-800" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
