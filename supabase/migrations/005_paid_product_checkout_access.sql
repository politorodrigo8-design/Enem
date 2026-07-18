-- Produto pago NexoENEM.
-- Converte o modelo comercial free/full para unpaid/paid/beta/admin sem alterar
-- migrations ja aplicadas e prepara checkout unico via Mercado Pago.

create extension if not exists "pgcrypto";

alter table public.profiles
  drop constraint if exists profiles_access_level_check;

update public.profiles
set access_level = case
  when access_level = 'free' then 'unpaid'
  when access_level = 'full' and beta_tester = true then 'beta'
  when access_level = 'full' then 'paid'
  when access_level in ('unpaid', 'paid', 'beta', 'admin') then access_level
  else 'unpaid'
end;

alter table public.profiles
  alter column access_level set default 'unpaid',
  add constraint profiles_access_level_check
    check (access_level in ('unpaid', 'paid', 'beta', 'admin'));

create or replace function public.has_platform_access(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(user_id, auth.uid())
      and p.access_level in ('paid', 'beta', 'admin')
      and (p.access_expires_at is null or p.access_expires_at > now())
  );
$$;

create or replace function public.has_full_access(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_platform_access(coalesce(user_id, auth.uid()));
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  slug text not null unique,
  regular_price_cents integer not null check (regular_price_cents > 0),
  sale_price_cents integer check (sale_price_cents is null or sale_price_cents > 0),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  access_valid_until timestamptz not null,
  active boolean not null default true,
  launch_ready boolean not null default false,
  checkout_provider text not null default 'mercado_pago'
    check (checkout_provider in ('mercado_pago', 'stripe', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sale_window_check check (
    sale_starts_at is null or sale_ends_at is null or sale_starts_at < sale_ends_at
  )
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'expired', 'charged_back')
  ),
  provider text not null default 'mercado_pago' check (provider in ('mercado_pago', 'stripe', 'manual')),
  provider_order_id text,
  checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint orders_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists orders_user_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists orders_provider_order_idx
  on public.orders (provider, provider_order_id)
  where provider_order_id is not null;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  provider text not null check (provider in ('mercado_pago', 'stripe', 'manual')),
  provider_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  processed boolean not null default false,
  processing_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create index if not exists payment_events_order_created_at_idx
  on public.payment_events (order_id, created_at desc);

insert into public.products (
  product_name,
  slug,
  regular_price_cents,
  sale_price_cents,
  sale_starts_at,
  sale_ends_at,
  access_valid_until,
  active,
  launch_ready,
  checkout_provider
)
values (
  'NexoENEM Completo',
  'nexoenem-completo-2026',
  9990,
  null,
  null,
  null,
  '2026-11-30 23:59:59-03'::timestamptz,
  true,
  false,
  'mercado_pago'
)
on conflict (slug) do update set
  product_name = excluded.product_name,
  regular_price_cents = excluded.regular_price_cents,
  access_valid_until = excluded.access_valid_until,
  active = excluded.active,
  checkout_provider = excluded.checkout_provider,
  updated_at = now();

create or replace function public.current_product_price_cents(product_row public.products)
returns integer
language sql
stable
as $$
  select case
    when product_row.active
      and product_row.sale_price_cents is not null
      and (product_row.sale_starts_at is null or product_row.sale_starts_at <= now())
      and (product_row.sale_ends_at is null or product_row.sale_ends_at >= now())
    then product_row.sale_price_cents
    else product_row.regular_price_cents
  end;
$$;

create or replace function public.prevent_student_access_field_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and auth.uid() = old.id then
    if new.access_level is distinct from old.access_level
      or new.access_expires_at is distinct from old.access_expires_at
      or new.beta_tester is distinct from old.beta_tester then
      raise exception 'access fields can only be changed by an administrator';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, access_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    'unpaid'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

create or replace function public.grant_paid_access_for_order(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_product public.products%rowtype;
begin
  select * into target_order
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  select * into target_product
  from public.products
  where id = target_order.product_id;

  if not found then
    raise exception 'product not found';
  end if;

  update public.orders
  set status = 'approved',
      paid_at = coalesce(paid_at, now()),
      expires_at = target_product.access_valid_until
  where id = target_order.id;

  update public.profiles
  set access_level = 'paid',
      access_expires_at = target_product.access_valid_until,
      beta_tester = false
  where id = target_order.user_id
    and access_level <> 'admin';

  insert into public.product_events (user_id, event_name, route, metadata)
  values
    (target_order.user_id, 'payment_approved', '/api/payments/webhook', jsonb_build_object('order_id', target_order.id)),
    (target_order.user_id, 'access_granted', '/api/payments/webhook', jsonb_build_object('access_level', 'paid'));
end;
$$;

create or replace function public.revoke_paid_access_for_order(
  target_order_id uuid,
  target_status text default 'refunded'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
begin
  if target_status not in ('refunded', 'charged_back', 'cancelled', 'expired', 'rejected') then
    raise exception 'invalid revocation status';
  end if;

  select * into target_order
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  update public.orders
  set status = target_status
  where id = target_order.id;

  update public.profiles
  set access_level = 'unpaid',
      access_expires_at = null,
      beta_tester = false
  where id = target_order.user_id
    and access_level = 'paid';

  insert into public.product_events (user_id, event_name, route, metadata)
  values
    (target_order.user_id, 'access_revoked', '/api/payments/webhook', jsonb_build_object('status', target_status));
end;
$$;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "products_read_public_active" on public.products;
create policy "products_read_public_active" on public.products
for select to anon, authenticated
using (active = true);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "orders_insert_own_pending" on public.orders;
create policy "orders_insert_own_pending" on public.orders
for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.active = true
      and amount_cents = public.current_product_price_cents(p)
  )
);

drop policy if exists "orders_no_client_update" on public.orders;
create policy "orders_no_client_update" on public.orders
for update to authenticated
using (false)
with check (false);

drop policy if exists "payment_events_no_client_access" on public.payment_events;
create policy "payment_events_no_client_access" on public.payment_events
for all to authenticated
using (false)
with check (false);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (
  id = auth.uid()
  and access_level = 'unpaid'
  and access_expires_at is null
  and beta_tester = false
);

drop policy if exists "questions_read_authenticated" on public.questions;
create policy "questions_read_authenticated" on public.questions
for select to authenticated
using (public.has_platform_access(auth.uid()));

drop policy if exists "question_options_read_authenticated" on public.question_options;
create policy "question_options_read_authenticated" on public.question_options
for select to authenticated
using (
  public.has_platform_access(auth.uid())
  and exists (
    select 1
    from public.questions q
    where q.id = question_id
  )
);

drop policy if exists "subjects_read_authenticated" on public.subjects;
create policy "subjects_read_authenticated" on public.subjects
for select to authenticated using (public.has_platform_access(auth.uid()));

drop policy if exists "topics_read_authenticated" on public.topics;
create policy "topics_read_authenticated" on public.topics
for select to authenticated using (public.has_platform_access(auth.uid()));

drop policy if exists "simulations_read_authenticated" on public.simulations;
create policy "simulations_read_authenticated" on public.simulations
for select to authenticated using (public.has_platform_access(auth.uid()));

drop policy if exists "simulation_questions_read_authenticated" on public.simulation_questions;
create policy "simulation_questions_read_authenticated" on public.simulation_questions
for select to authenticated using (public.has_platform_access(auth.uid()));

drop policy if exists "user_question_answers_own_insert" on public.user_question_answers;
create policy "user_question_answers_own_insert" on public.user_question_answers
for insert to authenticated
with check (user_id = auth.uid() and public.has_platform_access(auth.uid()));

drop policy if exists "user_simulations_own_insert_beta_access" on public.user_simulations;
create policy "user_simulations_own_insert_beta_access" on public.user_simulations
for insert to authenticated
with check (user_id = auth.uid() and public.has_platform_access(auth.uid()));

drop policy if exists "user_simulations_own_update" on public.user_simulations;
create policy "user_simulations_own_update" on public.user_simulations
for update to authenticated
using (user_id = auth.uid() and public.has_platform_access(auth.uid()))
with check (user_id = auth.uid() and public.has_platform_access(auth.uid()));

alter table public.product_events
  drop constraint if exists product_events_event_name_check;

alter table public.product_events
  add constraint product_events_event_name_check check (
    event_name in (
      'signup_completed',
      'checkout_started',
      'order_created',
      'payment_pending',
      'payment_approved',
      'payment_rejected',
      'payment_refunded',
      'access_granted',
      'access_revoked',
      'onboarding_started',
      'onboarding_completed',
      'diagnosis_started',
      'diagnosis_completed',
      'question_answered',
      'high_priority_training_started',
      'high_priority_question_completed',
      'simulation_started',
      'simulation_completed',
      'study_plan_generated',
      'study_plan_item_completed',
      'premium_block_seen',
      'beta_application_submitted',
      'feedback_submitted'
    )
  );

grant select on table public.products to anon, authenticated;
grant select, insert on table public.orders to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
