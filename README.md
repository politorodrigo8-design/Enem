# Pontua Enem

MVP web de preparacao estrategica para o ENEM, criado com Next.js App Router,
TypeScript, Tailwind CSS e Supabase para autenticacao, RLS e persistencia.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Validacao

```bash
npm run lint
npm run build
```

## Supabase

1. Crie um projeto no Supabase.
2. Copie `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local`.
3. Guarde `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor; nunca use no navegador.
4. Aplique as migrations em ordem.
5. Rode o seed de `supabase/seed.sql` se precisar dos dados demonstrativos.
6. Em Auth, configure o redirect URL para `http://localhost:3000/auth/callback`.

## Produto e acesso

O produto comercial preparado e:

- `Pontua Enem Completo`
- `R$ 99,90`
- pagamento unico
- sem mensalidade
- sem renovacao automatica
- acesso completo ate a data `access_valid_until` do produto ativo

Estados de `profiles.access_level`:

- `unpaid`: usuario cadastrado sem compra aprovada; pode acessar login, checkout, suporte e paginas legais.
- `paid`: compra aprovada e acesso ativo.
- `beta`: liberacao manual para testes, revisores ou convidados.
- `admin`: acesso administrativo futuro.

A migration `supabase/migrations/005_paid_product_checkout_access.sql` converte:

- `free -> unpaid`
- `full + beta_tester=true -> beta`
- `full -> paid`
- `beta/admin` existentes sao preservados quando ja existirem

## Checkout Mercado Pago

Rotas preparadas:

- `/checkout`
- `/pagamento/sucesso`
- `/pagamento/pendente`
- `/pagamento/falha`
- `/api/payments/create`
- `/api/payments/webhook`

Variaveis:

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MERCADO_PAGO_ACCESS_TOKEN=""
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=""
MERCADO_PAGO_WEBHOOK_SECRET=""
SUPABASE_SERVICE_ROLE_KEY=""
```

O checkout real fica bloqueado enquanto `products.launch_ready=false`. Para ativar vendas, revise conteudo, gateway, termos, politica de reembolso, webhooks e testes; depois altere o produto:

```sql
update public.products
set launch_ready = true
where slug = 'nexoenem-completo-2026';
```

Para testar em sandbox:

1. Use credenciais de teste do Mercado Pago em `.env.local`.
2. Defina `NEXT_PUBLIC_APP_URL` para a URL publica do ambiente local/tunel.
3. Cadastre `/api/payments/webhook` como webhook.
4. Ative `launch_ready` somente no banco de teste.
5. Crie conta, acesse `/checkout`, pague com meios de teste e confira `orders`, `payment_events` e `profiles`.

O retorno `/pagamento/sucesso` nao libera acesso. A liberacao ocorre apenas apos webhook assinado, consulta server-side ao Mercado Pago, validacao de valor, produto e usuario, e processamento idempotente.

## Acesso manual

Execute no SQL Editor administrativo, editando o e-mail antes:

```bash
supabase/scripts/grant_beta_access.sql
supabase/scripts/revoke_beta_access.sql
supabase/scripts/grant_paid_access.sql
supabase/scripts/revoke_paid_access.sql
```

## Estrutura

- `src/app/(public)`: landing, checkout, status de pagamento e paginas legais.
- `src/app/(auth)`: login, cadastro e recuperacao de senha com Supabase Auth.
- `src/app/dashboard`: area interna protegida por middleware e layout server-side.
- `src/lib/services/billing.ts`: produto e preco vindos do banco.
- `src/lib/services/mercado-pago.ts`: criacao de preferencia, consulta e assinatura de webhook.
- `src/lib/services/email-templates.ts`: templates transacionais preparados.
- `supabase/migrations`: schema, RLS, produto, pedidos e pagamentos.

## Transparencia editorial

Questoes oficiais antigas nao foram importadas nesta etapa. Dados demonstrativos devem permanecer identificados como demonstrativos. O Radar e o treino de alta prioridade usam regras reproduziveis, mas nao sao TRI real, IA ou previsao exata do que caira no ENEM. O Pontua Enem nao possui vinculo com MEC ou Inep.
