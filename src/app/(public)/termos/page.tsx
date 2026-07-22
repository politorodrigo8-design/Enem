import Link from "next/link";
import { LegalList, LegalPage } from "@/components/marketing/legal-page";
import {
  ESSAY_ACCEPTED_FILE_LABEL,
  ESSAY_CREDIT_COST_LABEL,
  ESSAY_UPLOAD_LIMIT_LABEL,
  PRODUCT_NAME,
} from "@/lib/product-config";

const SUPPORT_EMAIL = "suporte@pontuaenem.com.br";
const UPDATED_AT = "22 de julho de 2026";

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de uso"
      documentLabel="Termos de Uso do Pontua Enem"
      updatedAt={UPDATED_AT}
      notice="Leia antes de contratar ou usar a plataforma."
      sections={[
        {
          id: "apresentacao",
          heading: "Apresentação e aceitação",
          body: (
            <>
              <p>
                O Pontua Enem é uma plataforma educacional de preparação estratégica para
                o ENEM. Ao criar conta, acessar a plataforma ou contratar o {PRODUCT_NAME},
                você declara que leu e aceita estes Termos.
              </p>
              <p>
                A Política de Privacidade integra estes Termos. Usuários menores de idade
                devem utilizar a plataforma com ciência ou assistência do responsável legal,
                conforme aplicável.
              </p>
            </>
          ),
        },
        {
          id: "servico",
          heading: "Descrição do serviço",
          body: (
            <>
              <p>
                A plataforma pode oferecer banco revisado de questões, filtros de prática,
                diagnóstico, simulados, Radar ENEM, prioridades de estudo, plano semanal,
                desempenho, revisão de erros, créditos internos e envio de redações.
              </p>
              <p>
                As redações podem ser enviadas por texto digitado ou arquivo aceito pela
                plataforma. Recursos automatizados, recomendações e eventuais integrações de
                IA são usados apenas como apoio educacional quando estiverem disponíveis.
              </p>
              <p>
                Funcionalidades podem ser atualizadas, substituídas ou descontinuadas,
                desde que respeitados os direitos já adquiridos pelo usuário.
              </p>
            </>
          ),
        },
        {
          id: "natureza-educacional",
          heading: "Natureza educacional",
          body: (
            <>
              <p>
                O Pontua Enem é uma ferramenta complementar de estudos. Ele não substitui
                escola, professor, cursinho, orientação pedagógica individual ou
                acompanhamento profissional.
              </p>
              <LegalList
                items={[
                  "Não há garantia de aprovação, vaga, bolsa, classificação ou nota específica.",
                  "Radar, prioridades, indicadores e projeções são estimativas educacionais.",
                  "Não existe garantia de que determinado assunto, questão ou tema cairá no ENEM.",
                ]}
              />
            </>
          ),
        },
        {
          id: "conta",
          heading: "Cadastro e conta",
          body: (
            <LegalList
              items={[
                "Você deve fornecer dados corretos e manter suas informações atualizadas.",
                "A conta é pessoal e não pode ser compartilhada, vendida ou cedida.",
                "Você é responsável por proteger sua senha e avisar o suporte em caso de acesso indevido.",
                "Contas podem ser suspensas em caso de fraude, abuso, compartilhamento ou violação destes Termos.",
              ]}
            />
          ),
        },
        {
          id: "acesso-pagamento",
          heading: "Acesso, preço e pagamento",
          body: (
            <>
              <p>
                O produto atual é de pagamento único, sem mensalidade e sem renovação
                automática, salvo se uma oferta futura informar expressamente outra regra.
                O preço e o prazo de acesso aparecem no checkout.
              </p>
              <p>
                O pagamento é processado pelo Mercado Pago. O acesso é liberado após a
                confirmação do pagamento e pode depender da análise ou aprovação do provedor.
                O Pontua Enem não armazena diretamente os dados completos do cartão.
              </p>
              <p>
                O término do prazo de acesso não gera cobrança automática. Extensões,
                campanhas ou condições especiais só valem quando informadas de forma clara.
              </p>
            </>
          ),
        },
        {
          id: "creditos-redacao",
          heading: "Créditos internos e redação",
          body: (
            <>
              <p>
                Créditos são unidades internas de uso. Eles não representam moeda,
                investimento, saldo bancário e não podem ser convertidos em dinheiro.
              </p>
              <p>
                O envio confirmado de redação consome {ESSAY_CREDIT_COST_LABEL}. O usuário
                pode digitar a redação ou anexar {ESSAY_ACCEPTED_FILE_LABEL}, com{" "}
                {ESSAY_UPLOAD_LIMIT_LABEL}. A correção não é instantânea: o status fica
                disponível na plataforma até a devolutiva ser liberada.
              </p>
              <p>
                Arquivos ilegíveis, corrompidos, incompletos, ilícitos, ofensivos ou fora
                das regras podem ser recusados. Créditos adicionais só poderão ser
                comprados quando a opção estiver expressamente habilitada.
              </p>
            </>
          ),
        },
        {
          id: "conteudos-uso",
          heading: "Questões, conteúdos e uso permitido",
          body: (
            <>
              <p>
                Questões e conteúdos podem ser oficiais, adaptados, autorais ou
                demonstrativos, conforme indicado quando aplicável. Erros materiais podem
                ocorrer; o canal de suporte pode ser usado para comunicá-los.
              </p>
              <LegalList
                items={[
                  "É proibido copiar, revender, redistribuir, extrair em massa ou republicar o banco de questões.",
                  "É proibido automatizar acessos, fazer scraping, burlar pagamento ou créditos, explorar falhas ou realizar engenharia reversa indevida.",
                  "É proibido enviar malware, conteúdo ilegal, ofensivo ou que viole direitos de terceiros.",
                ]}
              />
            </>
          ),
        },
        {
          id: "propriedade-disponibilidade",
          heading: "Propriedade intelectual e disponibilidade",
          body: (
            <>
              <p>
                Marca, identidade visual, textos, interface, software, organização dos
                conteúdos e materiais autorais pertencem ao Pontua Enem ou a seus
                respectivos titulares. O usuário recebe apenas uma licença pessoal,
                limitada, revogável, não exclusiva e intransferível para uso educacional.
              </p>
              <p>
                A plataforma pode passar por manutenção, correções, mudanças de interface e
                indisponibilidades temporárias. Não prometemos disponibilidade
                ininterrupta, segurança absoluta ou funcionamento sem falhas.
              </p>
            </>
          ),
        },
        {
          id: "responsabilidades",
          heading: "Responsabilidades",
          body: (
            <>
              <p>
                O Pontua Enem atua com cuidado razoável para entregar o serviço contratado,
                sem excluir direitos garantidos pela legislação aplicável.
              </p>
              <p>
                A plataforma não responde por falhas do dispositivo ou internet do usuário,
                indisponibilidade de serviços externos, decisões de estudo tomadas
                exclusivamente pelo usuário, uso contrário às orientações ou eventos fora de
                controle razoável.
              </p>
            </>
          ),
        },
        {
          id: "reembolso-privacidade",
          heading: "Reembolso e privacidade",
          body: (
            <>
              <p>
                Compras online podem ter direito de arrependimento em até 7 dias, conforme
                a legislação aplicável. Veja a{" "}
                <Link href="/reembolso" className="font-semibold text-blue-700 hover:text-blue-800">
                  Política de Reembolso
                </Link>
                .
              </p>
              <p>
                O tratamento de dados pessoais é descrito na{" "}
                <Link href="/privacidade" className="font-semibold text-blue-700 hover:text-blue-800">
                  Política de Privacidade
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          id: "comunicacoes-alteracoes",
          heading: "Comunicações, alterações e conflitos",
          body: (
            <>
              <p>
                Podemos enviar comunicações essenciais por e-mail, avisos na plataforma e
                mensagens de suporte. Alterações relevantes destes Termos serão indicadas
                com nova data de atualização.
              </p>
              <p>
                Estes Termos seguem a legislação brasileira. Nenhuma disposição deve ser
                interpretada para retirar direitos do consumidor previstos em lei.
              </p>
            </>
          ),
        },
        {
          id: "contato",
          heading: "Contato e identificação",
          body: (
            <>
              <p>
                Canal oficial de suporte:{" "}
                <a className="font-semibold text-blue-700 hover:text-blue-800" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
              <p>
                O projeto ainda está em fase inicial. Dados institucionais formais e
                responsabilidades legais devem ser revisados com assessoria jurídica antes
                da abertura de vendas comerciais definitivas.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
