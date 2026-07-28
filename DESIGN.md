# Pontua Enem — Direção de design

Estética nomeada: **"caderno de prova"** — editorial, papel claro, tinta escura, um único azul-caneta como accent. Nada de gradientes, nada de glassmorphism, nada de roxo decorativo. Cada escolha abaixo é uma decisão; mudanças exigem atualizar este arquivo.

## Tipografia

- **UI e corpo:** Geist Sans (`--font-geist-sans`). Body ≥ 16px no marketing, 14px no dashboard.
- **Piso de 16px em campos abaixo de `sm`:** `input`, `select` e `textarea` recebem 16px por regra global em `globals.css`. Menos que isso e o iOS Safari aplica zoom ao focar e não desfaz no blur — a interface inteira fica escalada. A densidade de 14px do dashboard continua valendo a partir de `sm`. Não repetir `text-base sm:text-sm` campo por campo: a regra é global.
- **Display (marketing apenas):** Fraunces (`--font-display`), pesos 500–600, para `h1`/`h2` da landing e páginas públicas. Dá identidade editorial sem cair no "Inter em tudo". O dashboard NÃO usa a display — lá é trabalho, não vitrine.
- Números de estatística sempre com `tabular-nums`.
- Hierarquia por peso e tamanho, nunca por adicionar famílias novas.
- Labels em caps: usar com moderação (kicker de seção apenas), `tracking-wide`, 12px.

## Assinatura visual

- **Marca-texto** (`.highlight`, amber-200): o elemento de identidade. Destaca UMA expressão-chave por seção em headlines do marketing — remete ao grifo do caderno de estudos. Nunca em botões, nunca em texto corrido, nunca mais de uma vez por seção.
- Formulários de auth: sem abas — navegação entre entrar/criar/recuperar por links de texto ("Esqueci minha senha", "Criar conta").

## Cor

- **Neutros (~90% da interface):** escala `slate`. Fundo do marketing `#fcfcfa` (papel, não branco puro); texto `slate-900`.
- **Accent único (~10%):** azul-caneta `blue-700` (#1d4ed8). Hover `blue-800`. Tints `blue-50/100` para fundos de destaque.
- **Proibido:** violet/purple como cor de marca ou decoração; gradientes; neon.
- **Semânticas (só quando carregam informação):** sucesso `emerald-600`, erro `rose-600`, atenção `amber-600`. Prioridade no Radar: escala do próprio azul + âmbar/rosa por criticidade, nunca arco-íris.
- **Cores funcionais por área/matéria (2026-07):** `src/lib/subjects/subject-theme.mjs` é a fonte única de cor por área e matéria do ENEM (badges, gráficos, desempenho). É codificação de dado, não decoração: tons ~700 para texto, tints ~50/100 para fundo, sempre da paleta Tailwind. A proibição de violet/purple segue valendo também aqui; repetição de matiz entre áreas diferentes é aceitável (o badge de área dá o contexto). Matéria sem tema mapeado cai no neutro `slate`.
- Contraste: corpo sempre ≥ AA (slate-600 é o cinza mais claro permitido para texto sobre branco).

## Superfícies

- Ordem de separação: whitespace → shift de fundo (`slate-50` sobre branco) → `shadow-sm` → borda. Borda `slate-200` só quando as anteriores não bastam.
- Radius: `rounded-lg` (8px) para controles, `rounded-xl` (12px) para cards. Nada acima de `rounded-2xl`.
- Sombras: `shadow-sm` como padrão; `shadow-lg` apenas em overlays (modal, dropdown). Sem sombras coloridas.
- Sem card dentro de card. Sem borda esquerda colorida decorativa (só em `Notice` semântico).

## Espaçamento e layout

- Grid de 8pt (4px como meio-passo). Container do marketing `max-w-6xl`; dashboard `max-w-7xl`.
- Seções da landing variam de ritmo (não repetir o mesmo `py` + título centrado em todas); alternância de fundo branco/`slate-50` é permitida, mas o layout interno deve variar (texto à esquerda, split, lista editorial).
- Dashboard: densidade de trabalho — linhas compactas, tipografia menor, cor só onde há informação.

## Responsividade

Breakpoints do Tailwind v4: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280. Referências de teste: 320, 375, 768, 1024, 1440 e paisagem curta (667×375).

- **Container do dashboard mora no shell**, não nas páginas: `dashboard-shell.tsx` aplica `mx-auto w-full max-w-7xl`. Página nenhuma repete `max-w-7xl`.
- **Sidebar escalonada:** `w-72` no drawer mobile, `lg:w-60`, `xl:w-72`. Entrar em `lg` com 288px fixos deixava o conteúdo em 1024px mais estreito (672px) que em 768px (720px) — exatamente onde as grades de 3 colunas ligam.
- **Alvo de toque mínimo de 44px abaixo de `sm`.** O primitivo `Button` já garante (`h-11 … sm:h-9/h-10`); controle que não usa o primitivo (chip, tab, botão de ícone) precisa garantir por conta. Exceção: link inline dentro de frase corrida (WCAG 2.5.8) — cresça a área com `-my-*` + `min-h-11` quando o controle for autônomo.
- **Padding de card em dois passos:** `p-4` abaixo de `sm`, `p-5` a partir dele (no primitivo `Card`, não nas páginas). Em 320px, `p-5` consumia 40px dos 288px úteis.
- **Faixa de tablet (768–1023px) é decisão explícita, não sobra.** Não saltar de 1 para 3 colunas: passar por 2.
- **`truncate` dentro de item de grid/flex exige `min-w-0` em todos os elos** até o item. `truncate` implica `white-space: nowrap`, o min-content sobe pela árvore e o item — que tem `min-width: auto` — deixa de encolher, estourando o card. `html, body { overflow-x: clip }` esconde o sintoma: o conteúdo é cortado em vez de gerar scroll. Ausência de scroll horizontal não é prova de que não estoura; medir com `getBoundingClientRect`.
- **Overlay** usa `100dvh` (nunca `100vh`), tem scroll interno próprio, trava o scroll da página e fecha por backdrop e `Esc`. Elemento fixo no rodapé respeita `env(safe-area-inset-bottom)`.

## Motion

Sistema nomeado (implementado em `globals.css` + `components/ui/reveal.tsx`):

- **Entradas de conteúdo:** `<Reveal>` (viewport, uma vez) ou `.animate-rise` (no mount) — 400–500ms, `cubic-bezier(0.22,1,0.36,1)`, deslocamento ≤ 12px. Irmãos escalonados com 60–80ms (`delay`/`--rise-delay`). Revelar SEÇÕES e GRUPOS, não cada átomo.
- **Overlays** (dropdown, modal): `.animate-pop`, 160ms.
- **Micro-interações:** 150ms — botões com `active:scale-[0.98]`, hovers por cor, tabs por cor/borda. Cards clicáveis podem ter lift sutil (`hover:-translate-y-0.5 hover:shadow-md`).
- **Acordeões `<details>`:** abertura suave via CSS global (já aplicada).
- **Barras de progresso:** largura animada (600–700ms ease-out).
- Sem bounce, sem parallax, sem loops infinitos decorativos. Tudo respeita `prefers-reduced-motion` (o CSS global já desliga).

## Copy (pt-BR)

- Português correto e completo — acentuação e cedilha SEMPRE ("questões", "único", "até", "revisão").
- Voz: direta, específica, sem promessa irreal. Números concretos quando existirem.
- **Nunca expor jargão interno ao usuário:** "MVP", "launch_ready", "Supabase", "RLS", "arquitetura", "SaaS", "dados simulados/demonstrativos" fora de avisos legais explícitos.
- Transparência continua sendo diferencial (sem nota garantida, sem previsão exata), mas dita como benefício ao aluno, não como changelog do produto.
- Proibido: "revolucione", "potencialize", "desbloqueie seu potencial", emojis como ícone, "✨".

## Componentes

- Ícones: só `lucide-react`, tamanho consistente (16/20px), `aria-hidden`.
- Todo interativo tem hover, focus-visible, active, disabled desenhados.
- Estados vazio/carregando/erro desenhados em toda tela do dashboard (EmptyState com ação, Skeleton imediato).
