# Plataforma de Preparação Estratégica para o ENEM — Documentação Completa do Projeto

> Documento gerado a partir de uma análise integral do código-fonte, banco de dados, scripts e conteúdo em 18/07/2026. Descreve **o que o projeto é**, como cada parte funciona, o estado real de cada funcionalidade e o que falta para vender.

---

## Índice

1. [O que é o projeto](#1-o-que-é-o-projeto)
2. [Modelo de negócio](#2-modelo-de-negócio)
3. [Stack tecnológica](#3-stack-tecnológica)
4. [Arquitetura geral](#4-arquitetura-geral)
5. [Páginas públicas (marketing)](#5-páginas-públicas-marketing)
6. [Autenticação](#6-autenticação)
7. [Checkout e pagamentos (Mercado Pago)](#7-checkout-e-pagamentos-mercado-pago)
8. [Controle de acesso (unpaid / paid / beta / admin)](#8-controle-de-acesso)
9. [Dashboard — página por página](#9-dashboard--página-por-página)
10. [Lógica de priorização e scoring](#10-lógica-de-priorização-e-scoring)
11. [Modelo de dados (Supabase/Postgres)](#11-modelo-de-dados-supabasepostgres)
12. [Segurança (RLS, middleware, service role)](#12-segurança)
13. [Pipeline de conteúdo de questões](#13-pipeline-de-conteúdo-de-questões)
14. [Programa beta](#14-programa-beta)
15. [Testes](#15-testes)
16. [Estado real do projeto — o que funciona e o que não](#16-estado-real-do-projeto)
17. [Problemas conhecidos e bloqueadores](#17-problemas-conhecidos-e-bloqueadores)
18. [Roadmap sugerido para lançamento](#18-roadmap-sugerido-para-lançamento)

---

## 1. O que é o projeto

O projeto é um micro-SaaS de **preparação estratégica para o ENEM**, vendido como **pagamento único** (one-time), sem mensalidade. A tese do produto não é "mais um banco de questões", e sim **priorização**: dizer ao estudante *o que* estudar primeiro, com base em três sinais combinados:

1. **Recorrência histórica** dos tópicos nas provas oficiais do ENEM;
2. **Desempenho real do próprio aluno** ao responder questões dentro da plataforma;
3. **Autopercepção de dificuldade** declarada pelo aluno no diagnóstico inicial.

Esses sinais alimentam um **score de prioridade por tópico** que ordena tudo na plataforma: o Radar ENEM (mapa de tópicos priorizados), o plano de estudos semanal, o treino prioritário e a fila de revisão.

O posicionamento é deliberadamente **anti-hype e honesto**: a plataforma repete em várias telas que **não usa TRI**, **não usa IA**, **não prevê nota** e **não garante aprovação**. Há inclusive uma lista de linguagem proibida no pipeline editorial (`FORBIDDEN_PRIORITY_LANGUAGE`: "vai cair", "questão garantida", "tema confirmado", "previsão certa"). Todos os textos de prioridade se descrevem como "estimativa educacional".

**Nome/marca:** ainda em definição — o código e os textos atuais usam um nome provisório que será substituído antes do lançamento (há um domínio e um e-mail de suporte provisórios espalhados pelas páginas públicas, legais e de pagamento que precisarão ser trocados junto com o rebranding).

---

## 2. Modelo de negócio

| Item | Valor |
|---|---|
| Produto | Acesso completo à plataforma (produto único; nome comercial em definição) |
| Preço | **R$ 99,90** (`regular_price_cents: 9990`), sem promoção configurada |
| Cobrança | Pagamento único via **Mercado Pago** (Checkout Pro / preference) |
| Acesso | Até **30/11/2026** (`access_valid_until` — fim do ciclo ENEM 2026), não vitalício |
| Renovação | Nenhuma — sem assinatura, sem renovação automática |
| Estado atual | **`launch_ready = false`** — vendas desligadas por trava intencional no banco |

Público-alvo: estudantes que vão prestar o ENEM (mercado enorme, recorrente todo ano, com forte sazonalidade de compra entre o meio do ano e a prova em novembro).

Existe também um resquício de um modelo de **créditos avulsos** abandonado (página `/dashboard/creditos` e `getMockCheckoutState()`), 100% mock e desativado — "Créditos avulsos não estão à venda".

---

## 3. Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16.2.10** (App Router, Server Components, Server Actions) — ⚠️ versão com breaking changes; consultar `node_modules/next/dist/docs/` antes de codar (regra do `AGENTS.md`) |
| UI | React 19.2.4, Tailwind CSS 4, lucide-react (ícones), sonner (toasts) |
| Formulários | react-hook-form + zod 4 (`@hookform/resolvers`) |
| Backend/BaaS | **Supabase** — Postgres com RLS, Auth (e-mail/senha), `@supabase/ssr` para cookies em SSR |
| Pagamentos | **Mercado Pago** (API de preferences + webhook com HMAC) |
| Pipeline de conteúdo | Python (PyMuPDF) para extrair questões de PDFs oficiais do INEP; Node (`import-questions.mjs`) para importar no Supabase |
| Testes | `node --test` (11 testes de lógica pura) |
| Tipagem | TypeScript 5 em todo o app; regras compartilhadas em `.mjs` puros (`src/lib/questions/rules.mjs`, `src/lib/editorial/rules.mjs`) para reuso entre app e testes |

Total de código do app: **~11.500 linhas** em `src/`.

---

## 4. Arquitetura geral

```
src/
├── app/
│   ├── (public)/          # Landing, checkout, beta, páginas legais, retorno de pagamento
│   ├── (auth)/login/      # Login/cadastro/reset de senha
│   ├── auth/              # callback OAuth/confirm + reset-password
│   ├── api/payments/      # create (cria pedido+preference) e webhook (Mercado Pago)
│   └── dashboard/         # Produto em si (15 rotas protegidas)
├── components/
│   ├── ui/                # Design system próprio (card, button, badge, notice, progress…)
│   ├── dashboard/         # Shell, header, premium-gate, feedback
│   ├── marketing/         # Header público, hero, template de página legal
│   └── charts/            # Gráficos SVG artesanais (sem lib de chart)
├── lib/
│   ├── supabase/          # Clientes: browser, server (cookies), admin (service role), middleware, config
│   ├── db/                # queries.ts (toda a leitura), scoring.ts (priorização), types.ts
│   ├── actions/           # Server Actions: auth, learning, beta, editorial
│   ├── services/          # billing, mercado-pago, product-events (telemetria), email-templates (morto), database (stub)
│   ├── schemas/           # Zod: auth, beta, diagnosis
│   ├── questions/rules.mjs e editorial/rules.mjs
│   └── access.ts          # Modelo de níveis de acesso
├── data/                  # ⚠️ Mocks quase todos MORTOS (legado, não importados)
└── types/

supabase/
├── migrations/            # 001–006 (schema completo)
├── seed.sql               # 12 questões demo fictícias + dados de exemplo
├── imports/               # 14 questões oficiais ENEM prontas p/ importar (JSON)
└── scripts/               # SQL operacional manual (grant/revoke beta e paid)

scripts/                   # Pipeline Python de extração de questões + importador Node
tests/                     # 11 testes (regras de importação, questões, editorial)
public/enem-media/         # 27 PNGs recortados das provas oficiais
```

**Padrões importantes:**

- Todas as páginas do dashboard são **Server Components** com `force-dynamic`, que leem dados via `src/lib/db/queries.ts` e delegam interatividade a um `*-client.tsx`.
- Toda mutação passa por **Server Actions** (`src/lib/actions/*`) com validação Zod e revalidação de auth server-side.
- **Nenhum preço, nível de acesso ou resultado vem do cliente** — tudo é recalculado no servidor/banco.
- Telemetria de produto via `recordProductEvent()` → tabela `product_events`, com sanitização de PII (`sanitizeEventMetadata` bloqueia password/token/email/whatsapp etc.).

---

## 5. Páginas públicas (marketing)

### 5.1 Landing page — `src/app/(public)/page.tsx`

Funil clássico completo:

1. **Hero** — "Descubra o que estudar para aumentar sua nota no ENEM." + selos anti-hype ("Sem previsão exata", "Sem nota garantida", "Com foco em evolução").
2. **Problema** — 5 dores do estudante (não saber por onde começar, estudar sem ordem etc.).
3. **Como funciona** — 4 passos (diagnóstico → radar → plano → treino), com aviso de "dados simulados".
4. **Diferenciais** — 6 cards de features.
5. **Radar ENEM (demo)** — amostra visual com Notice de "demonstrativo".
6. **Preço** — card com R$ 99,90, lista do que está incluso, CTA para `/checkout`. Preço lido do servidor (`getPublicProduct()` → `getCurrentProductPrice()`).
7. **FAQ** — respostas honestas (admite que não há IA, que questões são "demonstrativas e autorais", que o Radar não prevê).

**Problemas conhecidos da landing:**
- Se `launch_ready=false`, renderiza aviso interno de dev ("Checkout real desativado") visível ao público.
- **Zero prova social** (nenhum depoimento/número).
- Sem ancoragem de preço, parcelamento ou selo de garantia; a garantia aparece como "política provisória" em texto cinza.
- **Acentuação inconsistente** em metade dos textos ("diagnostico", "questoes", "ate o ENEM").
- **Footer com todos os links quebrados**: Termos, Privacidade e Contato apontam para `/#` (`(public)/layout.tsx:37`).
- Contradição: o FAQ diz que as questões são "autorais", mas os imports contêm questões oficiais reais do ENEM 2023/2024.

### 5.2 Checkout — `/checkout`

- Exige Supabase configurado e usuário logado (senão redireciona para `/login?redirectedFrom=/checkout`).
- Se o usuário já tem acesso → redireciona para `/dashboard`.
- Mostra preço calculado no servidor e o `CheckoutButton`. Com `launch_ready=false`, o botão vira "Lista de espera" (desabilitado).

### 5.3 Páginas de retorno de pagamento

- `/pagamento/sucesso` — estática; explica que o acesso é liberado pelo webhook e oferece botão "Tentar acessar dashboard". **Não faz polling nem lê `?order=`** — o comprador fica sem feedback do estado real.
- `/pagamento/pendente` e `/pagamento/falha` — informativas, com canal de suporte.

### 5.4 Gates de acesso

- `/acesso-necessario` — para logado sem compra.
- `/acesso-expirado` — para acesso vencido (`access_expires_at <= now()`).

### 5.5 Páginas legais — `/termos`, `/privacidade`, `/reembolso`

Todas usam o template `LegalPage` e **se autodeclaram provisórias** ("Texto provisório para revisão jurídica antes da publicação comercial" + aviso fixo "Documento provisório. Revisar com assessoria jurídica antes de ativar vendas").

Lacunas jurídicas conhecidas:
- **Termos:** faltam foro, propriedade intelectual, limitação de responsabilidade, alteração de termos.
- **Privacidade:** não é LGPD completa — faltam base legal, encarregado/DPO, direitos do titular, retenção, citação dos suboperadores (Supabase, Mercado Pago, Vercel), cookies.
- **Reembolso:** não declara o prazo concreto de **7 dias do CDC art. 49**.

### 5.6 `/lote-001-preview` (QA interno exposto)

Tela de conferência editorial do lote 001 que **lê os JSONs de `supabase/imports/` do disco em runtime** (`fs.readFileSync(process.cwd()…)`). Não está linkada em lugar nenhum, não tem auth, e **quebra em deploy serverless** (Vercel) porque a pasta pode não existir no bundle. Deveria ser removida ou protegida.

---

## 6. Autenticação

- **Supabase Auth** com e-mail/senha. Fluxos: cadastro (modo default da tela é `signup`), login, reset de senha (e-mail → `/auth/reset-password`), callback em `/auth/callback`.
- Server Actions em `src/lib/actions/auth.ts` com validação Zod (`src/lib/schemas/auth.ts`).
- Ao criar usuário, o trigger `handle_new_user` (SECURITY DEFINER, idempotente) cria automaticamente a linha em `profiles` com `access_level='unpaid'`.
- **Login com Google é placeholder** — botão desabilitado "Continuar com Google em breve".
- ⚠️ **Bug grave:** os formulários têm `defaultValues` com credenciais de teste reais hardcoded (e-mail e senha de um dos fundadores) em `src/app/(auth)/login/page.tsx:55-70`. Precisa ser removido antes de qualquer deploy.
- `logAuthError` loga metadados de configuração (URL, tamanho de chave) — verboso demais para produção, mas não vaza segredos.

---

## 7. Checkout e pagamentos (Mercado Pago)

### 7.1 Fluxo completo

```
Usuário logado → /checkout → POST /api/payments/create
  ├─ Revalida auth (getUser) server-side
  ├─ Relê profile via admin client; se já tem acesso → 409
  ├─ Recalcula preço NO SERVIDOR (getCurrentProductPrice)
  ├─ Se launch_ready=false → 409 (vendas fechadas)
  ├─ INSERT em orders (status 'pending', amount do servidor)
  ├─ Cria preference no Mercado Pago (Idempotency-Key = order.id)
  ├─ Grava provider_order_id + checkout_url na order
  └─ Retorna redirectTo → browser vai para o checkout do MP

Mercado Pago → back_urls → /pagamento/{sucesso|pendente|falha}

Mercado Pago → POST /api/payments/webhook
  ├─ Valida assinatura HMAC (x-signature) com timingSafeEqual   ⚠️ só SE o secret estiver setado
  ├─ Registra payment_event (UNIQUE provider_event_id → dedup, 23505 = duplicate ok)
  ├─ Busca o PAGAMENTO REAL na API do MP (fetchMercadoPagoPayment) — não confia no payload
  ├─ Confere: produto, usuário, valor em centavos e moeda contra a order
  ├─ approved  → RPC grant_paid_access_for_order  (SECURITY DEFINER, FOR UPDATE na order)
  ├─ refunded/charged_back → RPC revoke_paid_access_for_order
  └─ rejected/cancelled → atualiza status da order
```

### 7.2 O que está bem feito

- Preço **nunca** vem do cliente; RLS ainda valida `amount_cents = current_product_price_cents()` no INSERT da order.
- Webhook confere valor/moeda/usuário/produto contra o pedido antes de conceder — impede grant forjado.
- Idempotência dupla: `payment_events.provider_event_id` UNIQUE + lock `FOR UPDATE` na RPC de concessão.
- Trava `launch_ready` no cliente E no servidor.
- Assinatura HMAC implementada corretamente (`timingSafeEqual`).

### 7.3 O que está errado ou faltando

| # | Problema | Onde | Gravidade |
|---|---|---|---|
| 1 | Verificação de assinatura é **fail-open**: sem `MERCADO_PAGO_WEBHOOK_SECRET`, qualquer POST é aceito | `webhook/route.ts:33-46` | **Alta** |
| 2 | `sandbox_init_point` priorizado sobre `init_point` → em produção pode mandar o cliente ao checkout sandbox | `mercado-pago.ts:69` | **Alta** |
| 3 | **Nenhum e-mail transacional é enviado** — `email-templates.ts` (7 templates) é código morto, nunca importado | `services/email-templates.ts` | **Alta** (UX/chargeback) |
| 4 | Cada clique cria uma nova order pending + preference (sem reaproveitamento) | `create/route.ts:82` | Média |
| 5 | `provider_event_id` cai no `id` de topo da notificação, que muda a cada retry do MP → dedup furada; idempotência real depende só da RPC | `webhook/route.ts:31` | Média |
| 6 | `/pagamento/sucesso` não confirma o pedido (sem polling) | — | Média |
| 7 | `checkout_started` registrado antes do gate `launch_ready` → polui métricas | `create/route.ts:56-64` | Baixa |
| 8 | Status `pending`/`in_process` do MP caem num else silencioso | `webhook/route.ts` | Baixa |
| 9 | Precedência de operador frágil na checagem de produto (`\|\|` + `&&` sem parênteses) | `webhook/route.ts:95` | Baixa |

---

## 8. Controle de acesso

### 8.1 Níveis (`profiles.access_level`)

| Nível | Significado | Como obtém |
|---|---|---|
| `unpaid` | Cadastrado sem compra. Acessa login, checkout, páginas legais. **Não acessa dashboard nem questões** | Default no cadastro |
| `paid` | Compra aprovada. Acesso completo até `access_expires_at` (30/11/2026) | Webhook → `grant_paid_access_for_order` |
| `beta` | Liberação manual para testers. **Equivalente a paid** para acesso, expira 30/11/2026 | SQL manual (`grant_beta_access.sql`) |
| `admin` | Acesso administrativo (habilita a área Editorial) | SQL manual |

Legados normalizados em `src/lib/access.ts`: `full → paid`, `free → unpaid`.

### 8.2 Regra única de acesso

No banco: `has_platform_access(uid)` = `access_level IN ('paid','beta','admin') AND (access_expires_at IS NULL OR access_expires_at > now())`. O TypeScript (`access.ts`) replica exatamente a mesma lógica. **Uma única fonte conceitual, implementada nos dois lados.**

### 8.3 Defesa em profundidade (3 camadas)

1. **Edge middleware** (`middleware.ts` → `lib/supabase/middleware.ts`): `getUser()` valida o JWT no servidor Supabase; para `/dashboard/*` sem acesso → redireciona `/checkout` ou `/acesso-expirado`; força onboarding incompleto → `/dashboard/onboarding`. Usa anon key sob RLS (lê só o próprio profile).
2. **Server-side por página**: `requirePlatformAccess()` (`queries.ts:89-108`) reexecuta a checagem em toda página do dashboard.
3. **RLS no Postgres**: `questions`, `question_options`, `question_media`, `subjects`, `topics`, `simulations` exigem `has_platform_access()` no SELECT; escrita de progresso idem. Mesmo burlando 1 e 2, um `unpaid` recebe result sets vazios.

**Conclusão testada: não dá para acessar o dashboard nem o conteúdo sem pagar (ou ser beta/admin).**

### 8.4 Anti-escalonamento de privilégio

- Trigger `prevent_student_access_field_update`: usuário autenticado **não consegue** alterar `access_level`, `access_expires_at` ou `beta_tester` da própria linha, mesmo tendo UPDATE no profile. Só service role passa.
- RLS de INSERT em profiles: `WITH CHECK (access_level='unpaid' AND access_expires_at IS NULL AND beta_tester=false)`.
- `orders`: UPDATE bloqueado no cliente (`USING (false)`); `payment_events`: sem acesso algum ao cliente.

---

## 9. Dashboard — página por página

Layout comum: `dashboard/layout.tsx` (shell com sidebar, identidade do usuário, gate de acesso, botão de feedback), `loading.tsx` (skeletons) e `error.tsx`.

### 9.1 `/dashboard` — Visão geral — ✅ REAL
`getDashboardData()` roda 5 queries paralelas. Mostra: questões respondidas, taxa de acerto, progresso do plano da semana, top prioridades (por `priority_score`), atividades recentes. Ressalva: o card "Simulados" é cosmético ("Ativo"/"Comece agora"), não conta simulados reais.

### 9.2 `/dashboard/onboarding` — ✅ REAL
Wizard de 9 passos (perfil, meta de nota, horas semanais, dias disponíveis…) → `saveOnboardingAction` persiste em `profiles.study_preferences` e redireciona ao diagnóstico. O middleware força onboarding incompleto.

### 9.3 `/dashboard/diagnostico` — ✅ REAL, ponta a ponta
Wizard de 3 etapas de autopercepção de dificuldade por área/tópico → `saveDiagnosisAction` valida com Zod, atualiza `profiles` e **recalcula `priority_score` de todos os tópicos** em `user_topic_performance` combinando a autopercepção. A tela de resultado é estática, mas os dados persistem e mudam o Radar.

### 9.4 `/dashboard/radar` — ✅ REAL
O coração do produto. `getTopicsWithPerformance()` + `getHighPriorityQuestionRecords()`. Lista tópicos com score de prioridade recalculado no cliente (`calculatePriorityScore`), filtros por área/prioridade, e a aba de questões de alta recorrência com **13 filtros editoriais** (categoria de recorrência, padrão de cobrança, competência etc.).
- Sub-rota `/radar/metodologia`: versões da metodologia lidas de `radar_methodology_versions` + documentação estática dos pesos.
- ⚠️ Bug de UX: usuário sem acesso vê "Nenhum tópico encontrado" em vez de um gate de compra (`radar-client.tsx:63`).

### 9.5 `/dashboard/questoes` — Banco de questões — ✅ REAL, ponta a ponta
Lista questões com enunciado, mídia, alternativas. Responder → `submitQuestionAnswerAction` insere em `user_question_answers`, **recalcula acurácia e priority_score do tópico** (`refreshTopicPerformance`) e registra telemetria. Favoritar/marcar para revisão funciona (`user_question_reviews`).
- ⚠️ `response_time_seconds: 0` hardcoded (`question-bank-client.tsx:162`) — o tempo nunca é medido, distorcendo a métrica de tempo médio no Desempenho.

### 9.6 `/dashboard/simulados` — ✅ REAL
Fluxo completo: `startSimulationAction` (cria `user_simulations`) → `saveSimulationAnswerAction` (upsert por questão) → `finishSimulationAction` (recalcula % no servidor).

**Montador dinâmico** (`generateSimulationAction`): monta um simulado na hora a partir do banco único de questões, por filtros de área, quantidade (5–90), dificuldade, língua estrangeira e "priorizar meus pontos fracos". O sorteio agrupa por tópico e faz round-robin para não concentrar o simulado num assunto só; com priorização, os tópicos de maior `priority_score` do aluno entram primeiro. O simulado gerado é gravado em `simulations` com `is_generated=true` e `created_by`, visível apenas ao dono (RLS), e reaproveita todo o fluxo de execução dos simulados de catálogo — que passam a ser apenas presets da mesma mecânica.
- ⚠️ "Refazer" ainda INSERE nova tentativa (histórico duplicado); a leitura de "última tentativa" já ordena por `started_at desc`.

### 9.7 `/dashboard/plano` — Plano de estudos — ✅ REAL
`generateStudyPlanAction`: arquiva o plano da semana, lê horas/dias disponíveis do perfil, seleciona os **top-7 tópicos por priority_score** (fallback: recorrência histórica), cria `study_plans` + `study_plan_items` com duração e meta de questões calculadas por regra. Marcar item como concluído persiste.
- ⚠️ "Reorganizar/arrastar e soltar" é só visual (assumido em comentário no código).

### 9.8 `/dashboard/desempenho` — ✅ REAL
Agregações de `getQuestionRecords()`/`getAreaMetrics()`: acurácia por área/disciplina/tópico com thresholds (75% forte / 55% atenção). Afetado pelo bug do tempo=0.

### 9.9 `/dashboard/revisao` — ✅ REAL
Fila de revisão: questões erradas ou marcadas. "Refazer" e "Dominei" persistem.

### 9.10 `/dashboard/treino-prioritario` — ✅ REAL
Reusa o banco de questões filtrado por flags editoriais de alta prioridade (fallback: `is_demo`), com telemetria própria.

### 9.11 `/dashboard/editorial` — ✅ REAL (só admin)
Área administrativa de edição de questões. Gate duplo: `access_level === 'admin'` + service role no servidor. Edição valida com Zod + `editorial/rules.mjs` (ex.: não aprova questão com mídia obrigatória não verificada).
- ⚠️ `reviewed_by` gravado como string literal `"admin-editor"` em vez do id real do usuário.

### 9.12 `/dashboard/configuracoes` — ✅ REAL
Perfil (nome, meta de nota, horas), troca de senha, logout.

### 9.13 `/dashboard/creditos` — ❌ 100% FACHADA
Saldo fictício "42 de 50" **hardcoded**, pacotes vindos do mock `creditPackages`, botões "Disponível em breve". Único uso vivo da pasta `src/data/`. Deveria sair do menu até existir.

### 9.14 Componentes de apoio
- `premium-gate.tsx` — gate visual de conteúdo pago.
- `feedback-button.tsx` — envia feedback beta (com rate-limit por RLS: máx. 5 em 10 min).
- `charts/` — SVGs artesanais; `simple-bar-chart.tsx` está **sem uso** (morto); `mini-trend.tsx` só é usado no marketing.

### 9.15 `src/data/*` — quase tudo morto
`areaPerformance`, `subjectPerformance`, `studentSummary`, `priorityCards`, `recentActivities`, `simulations`, `questions`, `weeklyStudyPlan`, `radarTopics` — **nenhum é importado por página nenhuma**. Só `creditPackages` (créditos, fachada) e `evolutionData` (hero do marketing) estão vivos. É legado da fase mock e pode ser deletado.

---

## 10. Lógica de priorização e scoring

Arquivo: `src/lib/db/scoring.ts`.

```
priority_score = recorrência_histórica/10
              + taxa_de_erro_do_aluno/10
              + strategic_importance (peso editorial)
              + peso_de_dificuldade (fácil 1.5 / médio 3 / difícil 4.5)
```

- Labels de prioridade por thresholds: alta ≥ 27, média ≥ 22, baixa ≥ 17 (valores mágicos).
- `refreshTopicPerformance` recalcula acurácia e score do tópico **a cada resposta** do aluno — o Radar reage ao uso real.
- O diagnóstico injeta a autopercepção no cálculo inicial.

**Fragilidades conhecidas:**
- `errorRate` default = **55** quando o aluno nunca respondeu o tópico (valor mágico que infla tópicos não praticados — defensável como heurística, mas não documentado ao usuário).
- Dois dos seis fatores anunciados na metodologia (`recent_exam_weight`, `target_score_weight`) estão com **peso 0 nesta beta** — anunciados mas não usados.
- Em `getHighPriorityQuestionRecords`, o score é calculado sem a performance do usuário (sempre default 55) e somado ao `priority_score` editorial — mistura de escalas.
- Pesos arbitrários e não normalizados (`strategic_importance` entra cru).

A metodologia é documentada e versionada (`radar_methodology_versions`) e a página `/radar/metodologia` explica os pesos ao usuário — transparência acima da média.

---

## 11. Modelo de dados (Supabase/Postgres)

### 11.1 Migrations

| Migration | Conteúdo |
|---|---|
| `001_initial_schema.sql` | Núcleo: profiles, subjects, topics, questions, question_options, user_question_answers, user_question_reviews, simulations, simulation_questions, user_simulations, user_simulation_answers, study_plans, study_plan_items, user_topic_performance. Trigger `handle_new_user` cria profile no cadastro. |
| `002_dashboard_grants.sql` | Grants para o dashboard |
| `003_fix_table_grants.sql` | Correção de grants |
| `004_beta_access_and_product_readiness.sql` | `access_level`/`access_expires_at`/`beta_tester`/`onboarding_completed`/`study_preferences` em profiles; beta_applications, beta_feedback, product_events, radar_methodology_versions; **~35 colunas editoriais** em questions; trigger anti-escalonamento |
| `005_paid_product_checkout_access.sql` | Modelo comercial: products, orders, payment_events; `access_level` vira unpaid/paid/beta/admin; funções `has_platform_access`, `grant_paid_access_for_order`, `revoke_paid_access_for_order`; RLS de conteúdo fechada por acesso pago |
| `006_question_media_and_review_toggle.sql` | `questions.media_required` + tabela question_media |
| `007_secure_access_rpcs.sql` | Restringe execução das RPCs de concessão de acesso ao service_role |
| `009_question_language.sql` | `questions.language` (`en`/`es`) para as questões de língua estrangeira |
| `010_generated_simulations.sql` | Simulados gerados pelo aluno: `created_by`, `is_generated`, `criteria` + RLS de dono |
| `011_service_role_grants.sql` | Devolve DML ao `service_role` em todo o schema (ver 12.2) |

### 11.2 Entidades principais

- **profiles** — 1:1 com `auth.users` (cascade). Acumula perfil + onboarding + preferências (jsonb) + estado de billing (`access_level`, `access_expires_at`).
- **subjects → topics → questions → question_options / question_media** — catálogo de conteúdo. `topics` carrega `historical_recurrence`, `strategic_importance`, `difficulty`.
- **questions** — ⚠️ virou "God table": conteúdo + ~35 colunas editoriais nullable (classificação, verificação, recorrência, fonte, notas) misturadas.
- **user_question_answers / user_question_reviews / user_topic_performance** — progresso e agregados do aluno.
- **simulations / simulation_questions / user_simulations / user_simulation_answers** — simulados de catálogo + tentativas.
- **study_plans / study_plan_items** — planos semanais gerados.
- **products / orders / payment_events** — comercial. `orders→products` com `ON DELETE RESTRICT` (preserva histórico); `payment_events` com `UNIQUE(provider, provider_event_id)`.
- **beta_applications / beta_feedback / product_events / radar_methodology_versions** — beta, feedback (com hash anti-duplicata e rate-limit), telemetria (enum de eventos sincronizado com o código), versões de metodologia.

### 11.3 Dívidas de modelagem

- "Free tier" **morto**: `questions.is_demo`, `is_free_question()` e o limite de 20 questões da migration 004 ficaram órfãos quando a 005 fechou tudo por `has_platform_access`. Hoje um `unpaid` não vê **nenhuma** questão, nem demo — se algum funil esperar demonstração gratuita, virá vazio.
- Fonte de verdade de acesso duplicada: `profiles.access_*` só sincroniza com `orders` dentro das RPCs do webhook; não há job de reconciliação.
- Sem constraint contra múltiplas orders `pending` do mesmo usuário.
- `handle_new_user`/`prevent_student_access_field_update` redefinidas na 005 (duplicação inofensiva, migrations não-limpas).

---

## 12. Segurança

### 12.1 O que está certo

- **Chaves:** nenhum `.env` no repositório; service role só em `SUPABASE_SERVICE_ROLE_KEY` (sem `NEXT_PUBLIC_`), lido por `admin.ts` que importa `"server-only"` (impossível ir ao bundle do cliente).
- **Service role usado somente onde precisa:** webhook, criação de pedido (pós-auth) e área editorial (pós-gate de admin).
- **RLS completa** em todas as tabelas de usuário com isolamento `user_id = auth.uid()` (EXISTS nas filhas).
- **Anti-escalonamento** por trigger + policies de INSERT restritivas (§8.4).
- **Telemetria com higiene de PII** (sanitização de metadados).
- Middleware fail-closed quando Supabase não está configurado.

### 12.2 Riscos abertos

0. **`service_role` sem DML (corrigido em `011`)** — as migrations 002/003 concederam privilégios só a `authenticated`, o que removeu os defaults do `service_role` em todo o schema `public`. Consequência: **qualquer** operação com a service key falhava com `permission denied` — incluindo o webhook de pagamento (gravar `payment_events`, atualizar `orders`/`profiles`) e a área editorial admin. Foi descoberto ao rodar o importador e corrigido pela migration `011_service_role_grants.sql`. **Aplicar essa migration no banco remoto antes de qualquer venda real.**

1. **Webhook fail-open sem secret** (§7.3 #1) — o mais grave.
2. `beta_applications` aceita INSERT de `anon` sem rate-limit (só unique de e-mail) — spam possível.
3. DoS leve de idempotência: `provider_event_id` derivado de campo controlável pelo remetente; um atacante que pré-insira o id faz o webhook legítimo virar `duplicate`.
4. `/lote-001-preview` sem auth expõe material de QA.
5. Credenciais de teste hardcoded no login (§6).

---

## 13. Pipeline de conteúdo de questões

### 13.1 Origem do conteúdo

As questões são **transcrições fiéis de provas oficiais do ENEM** (não geradas por IA), extraídas dos **PDFs públicos do INEP** (`download.inep.gov.br`) — cadernos e gabaritos de **2020 a 2025**, Dia 1 e Dia 2, aplicação regular impressa. Os arquivos ficam em `provas-oficiais/` (ignorado pelo git) e são listados em `scripts/enem-pilot-sources.json`, que registra a origem oficial.

### 13.2 Etapas do pipeline (`scripts/`)

1. **`enem-pilot-pipeline.py`** (PyMuPDF) — inventaria os PDFs, casa prova↔gabarito, mapeia questão→área pela faixa de numeração (1–45 Linguagens, 46–90 Humanas, 91–135 Natureza, 136–180 Matemática), extrai enunciado/alternativas, detecta idioma das questões 1–5, classifica tópico por regex e calcula priority_score. Processa até **6 anos** (12 pares). Cai para OCR quando a extração de texto vem corrompida. Só grava no import questões aprovadas+verificadas.
2. **`enem-media-extract.py`** — recorta a região de cada questão com mídia obrigatória (texto + figuras + alternativas em diagrama) para `public/enem-media/oficial/` e gera o `media-map.json`.
3. **`enem-editorial-export.py`** — divide as questões extraídas em lotes de trabalho editorial (`--only-pending` exporta só o que falta).
4. **`enem-editorial-apply.py`** — valida e mescla as decisões editoriais, anexa a mídia e gera os arquivos de import.
5. **`enem-recurrence-report.py`** — mede a recorrência por tópico no corpus e compara com as estimativas públicas.
6. **`scripts/import-questions.mjs`** — importador Node/Zod para o Supabase: upsert de subjects/topics, insert de questions/options/media, dedup por fingerprint, rollback em erro. `superRefine` só aceita questões com `source_verified + answer_verified + reviewed + review_status='approved'` e tópico dentro da taxonomia.
7. **`scripts/update-topic-recurrence.mjs`** — grava a recorrência medida em `topics.historical_recurrence`/`strategic_importance`.

Scripts legados da primeira leva (`enem-media-batch001.py`, `enem-review-batch001.py`, `enem-editorial-batch.py`, `enem-finalize-batch001.py`) seguem no repositório, mas foram substituídos pela esteira acima.

Meta interna declarada no código: **300 questões** (Matemática 100, Natureza 80, Humanas 60, Linguagens 60) — já superada (ver 13.3).

**Taxonomia congelada** (`src/lib/questions/taxonomy.json`): área → disciplina → tópico, com um `recurrence_hint` por tópico vindo dos levantamentos públicos de recorrência. O importador **rejeita** qualquer questão cujo par disciplina/tópico não exista nela, o que impede que lotes diferentes inventem nomes divergentes e quebrem os filtros e o Radar.

### 13.3 Estado atual do conteúdo

Fonte: os 24 PDFs oficiais do INEP (prova + gabarito, Dia 1 e Dia 2, **2020 a 2025**) em `provas-oficiais/` (fora do git; rebaixáveis pelo manifesto).

| Área | Questões no banco | Tópicos | Anos |
|---|---:|---:|---|
| Linguagens | 256 | 17 | 2020–2025 |
| Ciências Humanas | 237 | 31 | 2020–2025 |
| Ciências da Natureza | 215 | 25 | 2020–2025 |
| Matemática | 172 | 14 | 2020–2025 |
| **Total** | **880** | **87** | **~293% da meta de 300** |

Composição: 1.109 questões extraídas → 961 completas e únicas → **880 aprovadas e importadas**; 249 marcadas `needs_review` (dependem de recurso visual ou de conferência humana) e 55 rejeitadas pela validação. 49 questões de língua estrangeira (inglês e espanhol, com gabaritos distintos) e 31 com imagem obrigatória anexada.

**Mídia:** `scripts/enem-media-extract.py` recorta a região da questão no PDF original (texto + figuras + alternativas em diagrama) e grava em `public/enem-media/oficial/`, com `media-map.json` ligando cada imagem à questão. 203 imagens geradas.

**Correções estruturais aplicadas ao pipeline nesta rodada:**
- **Gabarito de espanhol** — o gabarito do Dia 1 traz duas colunas (inglês/espanhol) com respostas diferentes para as questões 1–5; o parser lia só a primeira e atribuía o gabarito do inglês às 30 questões de espanhol. Corrigido com chave `(idioma, número)`.
- **Alternativas** — a detecção agora exige a cadeia ordenada A→B→C→D→E, eliminando falsos positivos em poemas e fórmulas (148 extrações incompletas → 65).
- **Idioma** — inglês e espanhol deixaram de ser tratados como duplicatas; ambos são importados com a coluna `language`.
- **PDFs de 2021** — os arquivos daquele ano trazem subconjuntos de fonte sem mapa Unicode e a extração retornava lixo em ~100% das questões. O pipeline detecta a corrupção e cai para **OCR por coluna** (Tesseract em português), preservando a ordem de leitura; os marcadores circulados Ⓐ–Ⓔ, que o OCR não reconhece, são remapeados por posição.
- **Casamento prova↔gabarito** — passou a comparar o número do caderno, não a string com a cor.

**Limitações conhecidas:** 2021 é recuperado parcialmente (93 de ~175 questões); as resoluções foram redigidas e conferidas por IA contra o gabarito oficial (a validação exige que a explicação cite a letra oficial), mas **não passaram por professor humano**.

### 13.4 Risco jurídico (importante)

As provas do ENEM são obras do INEP/MEC, e os textos de apoio e imagens (fotos, obras, tirinhas, anúncios) frequentemente têm **direitos de terceiros**. O projeto reproduz tudo integralmente num produto **comercial pago** — enquanto a landing afirma que as questões são "demonstrativas e autorais" (contradição pública). A própria página do beta condiciona o uso de questões oficiais a "fonte, atribuição, integridade e revisão editorial". **Validação jurídica é pré-requisito de lançamento.**

---

## 14. Programa beta

- Página pública `/beta` com formulário de **candidatura** (nome, e-mail, WhatsApp, nota-alvo, cidade + checkbox de autorização de contato obrigatório) → grava em `beta_applications`. **Não concede acesso** — a liberação é 100% manual, via SQL:
  - `supabase/scripts/grant_beta_access.sql` — seta `access_level='beta'`, `beta_tester=true`, expira 30/11/2026;
  - `revoke_beta_access.sql`, `grant_paid_access.sql`, `revoke_paid_access.sql`, `grant_rodrigo_lifetime_paid_access.sql` (este dá acesso **vitalício** a um e-mail específico de fundador — exceção ao modelo);
  - `check_beta_rls_isolation.sql` — teste manual de isolamento.
- Dentro do produto, beta = paid para tudo; a diferença é rótulo/telemetria e o botão de feedback (rate-limit 5/10min via RLS).
- Estratégia implícita: usar o beta para validar o produto e (deveria) colher depoimentos para a landing.

---

## 15. Testes

`npm test` → `node --test tests/*.test.mjs` — **11 testes, todos passando**:

- `import-questions.test.mjs` (4) — só importa `approved`+revisada; bloqueia mídia obrigatória sem URL válida (rejeita `javascript:`); fingerprint de dedup; validação de URL.
- `editorial-rules.test.mjs` (3) — edição só para admin; bloqueio de aprovação sem mídia verificada; URL inválida.
- `question-rules.test.mjs` (3) — payload de resposta/acerto; toggle de favorito; recuperação da resposta mais recente.

**Lacunas:** zero cobertura dos ~60KB de Python do pipeline (extração, classificação, score), zero teste de integração do importador contra o banco, zero teste de UI/E2E, zero teste do fluxo de pagamento.

---

## 16. Estado real do projeto

### Funciona de ponta a ponta (persiste no banco) ✅
- Cadastro/login/reset de senha + criação automática de profile
- Onboarding (9 passos) e Diagnóstico (recalcula prioridades)
- Responder questões → atualiza acurácia e priority_score do tópico
- Favoritar/revisar questões; fila de Revisão
- Simulados (iniciar → responder → finalizar com %)
- Geração real do plano de estudos semanal por regras
- Radar, Desempenho, Visão geral (agregações reais)
- Área editorial admin (edição validada de questões)
- Configurações, feedback beta, telemetria
- Fluxo de pagamento completo (order → preference MP → webhook → grant), com trava `launch_ready`
- Controle de acesso em 3 camadas (middleware + página + RLS)

### Fachada / incompleto ❌⚠️
- ❌ Créditos (100% mock, saldo fictício hardcoded)
- ❌ E-mails transacionais (templates prontos, nunca enviados)
- ❌ Login com Google (botão desabilitado)
- ❌ Conteúdo: 14 questões (meta: 300; concorrência: milhares)
- ⚠️ Simulado "personalizado" não personaliza
- ⚠️ Drag-and-drop do plano é só visual
- ⚠️ Tempo por questão sempre 0
- ⚠️ Card "Simulados" da visão geral é cosmético
- ⚠️ Páginas legais provisórias; footer com links quebrados
- ⚠️ `src/data/` quase todo código morto

---

## 17. Problemas conhecidos e bloqueadores

### Bloqueadores de lançamento (ordem de prioridade)

1. ~~**CONTEÚDO**~~ — ✅ **resolvido**: 880 questões oficiais de 2020–2025 importadas nas 4 áreas (ver 13.3). Resta a revisão humana por professor das resoluções e o tratamento das 249 questões em `needs_review`.
2. **JURÍDICO** — parecer sobre reprodução de provas do INEP em produto pago + finalizar termos/privacidade (LGPD)/reembolso (prazo CDC). **Agora é o bloqueador nº 1**, e ficou mais material: o banco reproduz 880 questões oficiais, com recortes de imagem das provas.
3. **Aplicar `011_service_role_grants.sql` no banco remoto** — sem ela o webhook de pagamento não consegue gravar nada (ver 12.2).
4. **Webhook fail-open** — exigir `MERCADO_PAGO_WEBHOOK_SECRET` (rejeitar 401 sem ele).
5. **`sandbox_init_point`** priorizado — inverter para `init_point` em produção.
6. **Credenciais hardcoded no login** — remover `defaultValues`.
7. **E-mail de confirmação de compra** — ligar os templates a um provedor (Resend etc.).
8. **Footer** — apontar Termos/Privacidade/Contato para as rotas reais.
9. **`/lote-001-preview`** — remover ou proteger (quebra em serverless + expõe QA).

### Correções desejáveis (não bloqueiam)

- Página de sucesso com polling do pedido; reaproveitar order pending; dedup de eventos por `payment.id` real.
- Simulados: `ORDER BY` na leitura de tentativas; decidir se "personalizado" gera prova de verdade ou muda a copy.
- Medir `response_time_seconds` real; gate premium correto no Radar sem acesso; `reviewed_by` com id real.
- Limpar `src/data/`, `email-templates` (após uso), `database.ts` stub, `getMockCheckoutState`, colunas do free tier morto.
- Corrigir acentuação da landing; adicionar prova social, parcelamento, garantia visível.
- Rate-limit/captcha em `beta_applications`; reconciliação `orders`↔`profiles`.

---

## 18. Roadmap sugerido para lançamento

**Fase 1 — Conteúdo (caminho crítico, semanas):**
rodar pipeline em 2020–2022 + PPL → 300 questões nas 4 áreas; reconciliar mídia (26 PNGs órfãos / 7 URLs mortas); revisão humana amostral das resoluções; limpar caminhos Windows dos dados.

**Fase 2 — Jurídico (paralela):**
parecer sobre uso das provas oficiais; termos + privacidade LGPD + reembolso com prazo CDC; corrigir a contradição "autoral vs oficial" na landing.

**Fase 3 — Correções técnicas (1–2 dias):**
itens 3–8 dos bloqueadores acima.

**Fase 4 — Beta agressivo:**
liberar testers, colher depoimentos e métricas de uso → prova social.

**Fase 5 — Landing de venda + lançamento:**
reescrever copy em torno do conteúdo real, prova social, garantia de 7 dias visível, parcelamento; `launch_ready = true`.

---

## Apêndice: comandos úteis

```bash
npm run dev      # dev server (usa --use-system-ca)
npm run build    # build de produção
npm run lint     # eslint
npm test         # 11 testes node --test

# --- Pipeline de conteúdo (ordem completa) ---
# 0. Baixar as provas oficiais (uma vez), para provas-oficiais/
#    https://download.inep.gov.br/enem/provas_e_gabaritos/{ano}_{PV|GB}_impresso_{D1|D2}_{CD1|CD7}.pdf

# 1. Ambiente Python (PyMuPDF) + OCR em português (necessário para 2021)
python3.14 -m venv .venv && .venv/bin/pip install -r scripts/requirements-enem-pipeline.txt
# tesseract + por.traineddata em $TESSDATA_PREFIX

# 2. Extrair questões dos PDFs
TESSDATA_PREFIX=... .venv/bin/python scripts/enem-pilot-pipeline.py

# 3. Recortar a mídia das questões que dependem de imagem
.venv/bin/python scripts/enem-media-extract.py

# 4. Exportar lotes editoriais → revisar → aplicar decisões
python3 scripts/enem-editorial-export.py                 # todos
python3 scripts/enem-editorial-export.py --only-pending  # só o que falta
python3 scripts/enem-editorial-apply.py

# 5. Importar no Supabase (preview sem --commit)
node scripts/import-questions.mjs --file supabase/imports/enem-piloto-humanas.json --commit

# 6. Medir recorrência e gravar nos tópicos
python3 scripts/enem-recurrence-report.py
node scripts/update-topic-recurrence.mjs --commit

# Variáveis de ambiente necessárias (.env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # só servidor
MERCADO_PAGO_ACCESS_TOKEN=        # só servidor
MERCADO_PAGO_WEBHOOK_SECRET=      # OBRIGATÓRIO em produção
NEXT_PUBLIC_SITE_URL=
```
