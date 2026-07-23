-- 022: legal document versions and auditable acceptance records.

create extension if not exists "pgcrypto";

alter table public.credit_ledger
  drop constraint if exists credit_ledger_reason_check;

alter table public.credit_ledger
  add constraint credit_ledger_reason_check check (
    reason in (
      'initial_allowance',
      'essay_correction',
      'essay_refund',
      'manual_adjustment',
      'training_reward',
      'simulation_reward',
      'study_plan_reward',
      'purchase',
      'purchase_refund',
      'ai_question_explanation',
      'ai_performance_analysis',
      'ai_study_plan',
      'ai_credit_refund',
      'weekly_essay_topic'
    )
  );

create unique index if not exists credit_ledger_one_purchase_refund_per_order_unique
  on public.credit_ledger (reference_type, reference_id, reason)
  where reference_type = 'order'
    and reason = 'purchase_refund'
    and reference_id is not null;

create table if not exists public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (
    document_type in ('terms_of_use', 'privacy_policy', 'refund_policy')
  ),
  version text not null check (length(btrim(version)) between 4 and 40),
  effective_at timestamptz not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (document_type, version)
);

create unique index if not exists legal_document_versions_one_current_unique
  on public.legal_document_versions (document_type)
  where is_current;

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  acceptance_key text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (
    document_type in ('terms_of_use', 'privacy_policy', 'refund_policy')
  ),
  document_version text not null,
  document_version_id uuid references public.legal_document_versions(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  acceptance_context text not null check (
    acceptance_context in ('signup', 'main_checkout', 'credit_checkout', 'policy_reacceptance')
  ),
  order_id uuid references public.orders(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  constraint legal_acceptances_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint legal_acceptances_document_version_match_unique
    unique (user_id, document_type, document_version, acceptance_context, acceptance_key)
);

create index if not exists legal_acceptances_user_accepted_at_idx
  on public.legal_acceptances (user_id, accepted_at desc);

create index if not exists legal_acceptances_order_idx
  on public.legal_acceptances (order_id)
  where order_id is not null;

alter table public.legal_document_versions enable row level security;
alter table public.legal_acceptances enable row level security;

drop policy if exists "legal_document_versions_read_current" on public.legal_document_versions;
create policy "legal_document_versions_read_current" on public.legal_document_versions
for select to anon, authenticated
using (is_current = true);

drop policy if exists "legal_acceptances_select_own" on public.legal_acceptances;
create policy "legal_acceptances_select_own" on public.legal_acceptances
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "legal_acceptances_no_client_insert" on public.legal_acceptances;
create policy "legal_acceptances_no_client_insert" on public.legal_acceptances
for insert to authenticated
with check (false);

drop policy if exists "legal_acceptances_no_client_update" on public.legal_acceptances;
create policy "legal_acceptances_no_client_update" on public.legal_acceptances
for update to authenticated
using (false)
with check (false);

drop policy if exists "legal_acceptances_no_client_delete" on public.legal_acceptances;
create policy "legal_acceptances_no_client_delete" on public.legal_acceptances
for delete to authenticated
using (false);

update public.legal_document_versions
set is_current = false
where version <> '2026-07-23'
  and document_type in ('terms_of_use', 'privacy_policy', 'refund_policy');

insert into public.legal_document_versions (
  document_type,
  version,
  effective_at,
  content_hash,
  is_current
)
values
  (
    'terms_of_use',
    '2026-07-23',
    '2026-07-23 00:00:00-03'::timestamptz,
    '0f0f8d4f4f8b18b6c0d3c2c9c5266d2b4e1e17e9c70d0a2f5d81a9d4e0f2b6a1',
    true
  ),
  (
    'privacy_policy',
    '2026-07-23',
    '2026-07-23 00:00:00-03'::timestamptz,
    '3d9e7a7e5c0b672f2cdb93c1d4a1f9ef3ac6611e2e18f7bcf5f1fd6d1a4e8c22',
    true
  ),
  (
    'refund_policy',
    '2026-07-23',
    '2026-07-23 00:00:00-03'::timestamptz,
    '8c8d2a6e904b91d39eb9a53e9c4e2d8a77f9d2fb00e32b45d9b596f4df9558d1',
    true
  )
on conflict (document_type, version) do update set
  effective_at = excluded.effective_at,
  content_hash = excluded.content_hash,
  is_current = excluded.is_current;

revoke all on table public.legal_acceptances from public, anon, authenticated;
grant select on table public.legal_acceptances to authenticated;
grant select on table public.legal_document_versions to anon, authenticated;
grant all on table public.legal_acceptances to service_role;
grant all on table public.legal_document_versions to service_role;

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
  target_product public.products%rowtype;
  account public.credit_accounts;
  refund_ledger public.credit_ledger;
  refundable_credits integer := 0;
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

  select * into target_product
  from public.products
  where id = target_order.product_id;

  if not found then
    raise exception 'product not found';
  end if;

  update public.orders
  set status = target_status
  where id = target_order.id;

  if target_product.product_kind = 'credit_package' then
    select *
    into refund_ledger
    from public.credit_ledger
    where user_id = target_order.user_id
      and reason = 'purchase_refund'
      and reference_type = 'order'
      and reference_id = target_order.id
    limit 1;

    if found then
      return;
    end if;

    select *
    into account
    from public.credit_accounts
    where user_id = target_order.user_id
    for update;

    if found then
      refundable_credits := least(account.balance, coalesce(target_product.credit_amount, 0));

      if refundable_credits > 0 then
        update public.credit_accounts
        set balance = balance - refundable_credits
        where user_id = target_order.user_id
        returning * into account;

        insert into public.credit_ledger (
          user_id,
          amount,
          balance_after,
          reason,
          reference_type,
          reference_id,
          metadata
        )
        values (
          target_order.user_id,
          -refundable_credits,
          account.balance,
          'purchase_refund',
          'order',
          target_order.id,
          jsonb_build_object(
            'product_id', target_product.id,
            'product_slug', target_product.slug,
            'credit_amount', target_product.credit_amount,
            'order_amount_cents', target_order.amount_cents,
            'target_status', target_status
          )
        );
      end if;
    end if;

    return;
  end if;

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
