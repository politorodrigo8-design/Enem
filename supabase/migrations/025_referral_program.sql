-- 025: referral program ("Indique e ganhe").
--
-- The program uses the existing credit_accounts + credit_ledger model. Referral
-- rewards are intentionally processed by SECURITY DEFINER functions so the
-- browser can never grant credits directly.

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists referral_code text;

create or replace function public.normalize_referral_code(input_code text)
returns text
language sql
immutable
as $$
  select nullif(upper(regexp_replace(btrim(coalesce(input_code, '')), '\s+', '', 'g')), '');
$$;

create or replace function public.generate_unique_referral_code(input_seed text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea;
  token text;
  candidate text;
  index integer;
begin
  loop
    token := '';
    random_bytes := gen_random_bytes(5);

    for index in 0..4 loop
      token := token || substr(alphabet, (get_byte(random_bytes, index) % length(alphabet)) + 1, 1);
    end loop;

    candidate := 'PONTUA-' || token;

    exit when not exists (
      select 1
      from public.profiles p
      where lower(p.referral_code) = lower(candidate)
    );
  end loop;

  return candidate;
end;
$$;

update public.profiles
set referral_code = public.generate_unique_referral_code(email)
where referral_code is null;

alter table public.profiles
  alter column referral_code set not null,
  drop constraint if exists profiles_referral_code_format_check;

alter table public.profiles
  add constraint profiles_referral_code_format_check check (
    referral_code ~ '^[A-Z0-9][A-Z0-9-]{5,31}$'
  );

create unique index if not exists profiles_referral_code_lower_unique
  on public.profiles (lower(referral_code));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, access_level, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    'unpaid',
    public.generate_unique_referral_code(new.email)
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
    updated_at = now();
  return new;
end;
$$;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  referral_code text not null,
  campaign_slug text not null default 'indique-e-ganhe-2026',
  status text not null default 'awaiting_purchase' check (
    status in (
      'registered',
      'awaiting_purchase',
      'payment_confirmed',
      'pending_release',
      'reward_granted',
      'cancelled',
      'refunded',
      'blocked'
    )
  ),
  review_status text not null default 'clear' check (
    review_status in ('clear', 'needs_review', 'blocked')
  ),
  referrer_reward_credits integer not null default 30 check (referrer_reward_credits > 0),
  referred_bonus_credits integer not null default 20 check (referred_bonus_credits > 0),
  order_id uuid references public.orders(id) on delete set null,
  provider_payment_id text,
  attributed_at timestamptz not null default now(),
  purchased_at timestamptz,
  reward_available_at timestamptz,
  referred_reward_granted_at timestamptz,
  referrer_reward_granted_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  referred_reward_ledger_id uuid references public.credit_ledger(id) on delete set null,
  referrer_reward_ledger_id uuid references public.credit_ledger(id) on delete set null,
  referred_reversal_ledger_id uuid references public.credit_ledger(id) on delete set null,
  referrer_reversal_ledger_id uuid references public.credit_ledger(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrals_no_self_referral_check check (referrer_user_id <> referred_user_id),
  constraint referrals_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists referrals_one_referrer_per_referred_unique
  on public.referrals (referred_user_id);

create unique index if not exists referrals_one_rewarded_order_unique
  on public.referrals (order_id)
  where order_id is not null;

create index if not exists referrals_referrer_status_idx
  on public.referrals (referrer_user_id, status, created_at desc);

create index if not exists referrals_reward_release_idx
  on public.referrals (reward_available_at)
  where status = 'pending_release'
    and referrer_reward_granted_at is null
    and review_status = 'clear';

drop trigger if exists referrals_set_updated_at on public.referrals;
create trigger referrals_set_updated_at
before update on public.referrals
for each row execute function public.set_updated_at();

alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own_referrer" on public.referrals;
create policy "referrals_select_own_referrer" on public.referrals
for select to authenticated
using (referrer_user_id = auth.uid());

drop policy if exists "referrals_no_client_insert" on public.referrals;
create policy "referrals_no_client_insert" on public.referrals
for insert to authenticated
with check (false);

drop policy if exists "referrals_no_client_update" on public.referrals;
create policy "referrals_no_client_update" on public.referrals
for update to authenticated
using (false)
with check (false);

drop policy if exists "referrals_no_client_delete" on public.referrals;
create policy "referrals_no_client_delete" on public.referrals
for delete to authenticated
using (false);

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
      'weekly_essay_topic',
      'referral_referred_bonus',
      'referral_referrer_bonus',
      'referral_bonus_reversal'
    )
  );

create unique index if not exists credit_ledger_one_referral_referred_bonus_unique
  on public.credit_ledger (reference_type, reference_id, reason)
  where reference_type = 'referral'
    and reason = 'referral_referred_bonus'
    and reference_id is not null;

create unique index if not exists credit_ledger_one_referral_referrer_bonus_unique
  on public.credit_ledger (reference_type, reference_id, reason)
  where reference_type = 'referral'
    and reason = 'referral_referrer_bonus'
    and reference_id is not null;

create unique index if not exists credit_ledger_one_referral_reversal_per_role_unique
  on public.credit_ledger (reference_type, reference_id, reason, (metadata ->> 'reward_role'))
  where reference_type = 'referral'
    and reason = 'referral_bonus_reversal'
    and reference_id is not null;

create or replace function public.resolve_referral_code(input_code text)
returns table (referral_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := public.normalize_referral_code(input_code);
begin
  if normalized_code is null or normalized_code !~ '^[A-Z0-9][A-Z0-9-]{5,31}$' then
    return;
  end if;

  return query
  select p.referral_code
  from public.profiles p
  where lower(p.referral_code) = lower(normalized_code)
  limit 1;
end;
$$;

create or replace function public.ensure_referral_code(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role text := coalesce(auth.role(), '');
  ensured_code text;
begin
  if target_user_id is null then
    raise exception 'missing user id';
  end if;

  if current_role <> 'service_role' and target_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  update public.profiles
  set referral_code = coalesce(referral_code, public.generate_unique_referral_code(email))
  where id = target_user_id
  returning referral_code into ensured_code;

  if ensured_code is null then
    raise exception 'profile not found';
  end if;

  return ensured_code;
end;
$$;

create or replace function public.attach_referral_to_new_user(
  target_referred_user_id uuid,
  input_referral_code text,
  input_source text default 'signup_cookie'
)
returns public.referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := public.normalize_referral_code(input_referral_code);
  referrer public.profiles%rowtype;
  referred public.profiles%rowtype;
  existing_referral public.referrals%rowtype;
  inserted_referral public.referrals%rowtype;
begin
  if target_referred_user_id is null then
    return null;
  end if;

  select *
  into existing_referral
  from public.referrals
  where referred_user_id = target_referred_user_id;

  if found then
    return existing_referral;
  end if;

  if normalized_code is null or normalized_code !~ '^[A-Z0-9][A-Z0-9-]{5,31}$' then
    return null;
  end if;

  select *
  into referrer
  from public.profiles
  where lower(referral_code) = lower(normalized_code);

  if not found then
    return null;
  end if;

  select *
  into referred
  from public.profiles
  where id = target_referred_user_id;

  if not found then
    return null;
  end if;

  if referred.created_at < now() - interval '1 day' then
    return null;
  end if;

  if referrer.id = referred.id then
    return null;
  end if;

  if lower(referrer.email) = lower(referred.email) then
    return null;
  end if;

  if exists (
    select 1
    from public.orders o
    join public.products p on p.id = o.product_id
    where o.user_id = target_referred_user_id
      and p.product_kind = 'access'
      and o.status in ('approved', 'refunded', 'charged_back')
  ) then
    return null;
  end if;

  insert into public.referrals (
    referrer_user_id,
    referred_user_id,
    referral_code,
    status,
    attributed_at,
    metadata
  )
  values (
    referrer.id,
    referred.id,
    referrer.referral_code,
    'awaiting_purchase',
    now(),
    jsonb_build_object(
      'source', coalesce(nullif(btrim(input_source), ''), 'signup_cookie')
    )
  )
  on conflict (referred_user_id) do nothing
  returning * into inserted_referral;

  if not found then
    select *
    into inserted_referral
    from public.referrals
    where referred_user_id = target_referred_user_id;
  end if;

  if inserted_referral.id is null then
    return null;
  end if;

  insert into public.product_events (user_id, event_name, route, metadata)
  values (
    referred.id,
    'signup_with_referral',
    '/login',
    jsonb_build_object('referral_id', inserted_referral.id)
  );

  return inserted_referral;
end;
$$;

create or replace function public.ensure_referral_credit_account(target_user_id uuid)
returns public.credit_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  account public.credit_accounts;
begin
  if target_user_id is null then
    raise exception 'missing user id';
  end if;

  insert into public.credit_accounts (user_id, balance, monthly_allowance)
  values (target_user_id, 50, 50)
  on conflict (user_id) do nothing;

  select *
  into account
  from public.credit_accounts
  where user_id = target_user_id
  for update;

  insert into public.credit_ledger (
    user_id,
    amount,
    balance_after,
    reason,
    reference_type,
    metadata
  )
  select
    target_user_id,
    account.monthly_allowance,
    account.balance,
    'initial_allowance',
    'credit_account',
    jsonb_build_object('cycle_started_at', account.cycle_started_at)
  where not exists (
    select 1
    from public.credit_ledger cl
    where cl.user_id = target_user_id
      and cl.reason = 'initial_allowance'
  );

  return account;
end;
$$;

create or replace function public.grant_referred_referral_bonus(
  target_referral_id uuid,
  target_order_id uuid,
  input_provider_payment_id text default null
)
returns public.referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  target_referral public.referrals%rowtype;
  account public.credit_accounts;
  inserted_ledger public.credit_ledger%rowtype;
begin
  select *
  into target_referral
  from public.referrals
  where id = target_referral_id
  for update;

  if not found then
    raise exception 'referral not found';
  end if;

  if target_referral.status in ('cancelled', 'refunded', 'blocked') then
    return target_referral;
  end if;

  if target_referral.referred_reward_granted_at is null then
    select *
    into inserted_ledger
    from public.credit_ledger
    where reference_type = 'referral'
      and reference_id = target_referral.id
      and reason = 'referral_referred_bonus'
    limit 1;

    if not found then
      account := public.ensure_referral_credit_account(target_referral.referred_user_id);

      update public.credit_accounts
      set balance = balance + target_referral.referred_bonus_credits
      where user_id = target_referral.referred_user_id
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
        target_referral.referred_user_id,
        target_referral.referred_bonus_credits,
        account.balance,
        'referral_referred_bonus',
        'referral',
        target_referral.id,
        jsonb_build_object(
          'referral_id', target_referral.id,
          'order_id', target_order_id,
          'provider_payment_id', input_provider_payment_id,
          'reward_role', 'referred',
          'source', 'indique_e_ganhe'
        )
      )
      returning * into inserted_ledger;
    end if;

    update public.referrals
    set status = 'pending_release',
        order_id = target_order_id,
        provider_payment_id = coalesce(input_provider_payment_id, provider_payment_id),
        purchased_at = coalesce(purchased_at, now()),
        reward_available_at = coalesce(reward_available_at, now() + interval '7 days'),
        referred_reward_granted_at = now(),
        referred_reward_ledger_id = inserted_ledger.id
    where id = target_referral.id
    returning * into target_referral;

    insert into public.product_events (user_id, event_name, route, metadata)
    values (
      target_referral.referred_user_id,
      'referral_bonus_granted',
      '/api/payments/webhook',
      jsonb_build_object(
        'referral_id', target_referral.id,
        'reward_role', 'referred',
        'credits', target_referral.referred_bonus_credits
      )
    );
  else
    update public.referrals
    set status = case
          when referrer_reward_granted_at is null then 'pending_release'
          else status
        end,
        order_id = coalesce(order_id, target_order_id),
        provider_payment_id = coalesce(provider_payment_id, input_provider_payment_id),
        purchased_at = coalesce(purchased_at, now()),
        reward_available_at = coalesce(reward_available_at, now() + interval '7 days')
    where id = target_referral.id
    returning * into target_referral;
  end if;

  return target_referral;
end;
$$;

create or replace function public.process_referral_purchase_for_order(
  target_order_id uuid,
  input_provider_payment_id text default null
)
returns public.referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_product public.products%rowtype;
  target_referral public.referrals%rowtype;
begin
  select *
  into target_order
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  select *
  into target_product
  from public.products
  where id = target_order.product_id;

  if not found then
    raise exception 'product not found';
  end if;

  if target_product.product_kind <> 'access' or target_order.status <> 'approved' then
    return null;
  end if;

  select *
  into target_referral
  from public.referrals
  where referred_user_id = target_order.user_id
  for update;

  if not found then
    return null;
  end if;

  if target_referral.review_status = 'blocked' then
    update public.referrals
    set status = 'blocked',
        cancelled_at = coalesce(cancelled_at, now()),
        cancellation_reason = coalesce(cancellation_reason, 'manual_review_blocked')
    where id = target_referral.id
    returning * into target_referral;
    return target_referral;
  end if;

  if target_referral.order_id is not null and target_referral.order_id <> target_order.id then
    return target_referral;
  end if;

  if exists (
    select 1
    from public.orders o
    join public.products p on p.id = o.product_id
    where o.user_id = target_order.user_id
      and o.id <> target_order.id
      and p.product_kind = 'access'
      and o.status = 'approved'
  ) then
    update public.referrals
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        cancellation_reason = coalesce(cancellation_reason, 'not_first_valid_purchase')
    where id = target_referral.id
      and order_id is null
    returning * into target_referral;
    return target_referral;
  end if;

  update public.referrals
  set status = 'payment_confirmed',
      order_id = target_order.id,
      provider_payment_id = coalesce(input_provider_payment_id, provider_payment_id),
      purchased_at = coalesce(purchased_at, now()),
      reward_available_at = coalesce(reward_available_at, now() + interval '7 days')
  where id = target_referral.id
  returning * into target_referral;

  target_referral := public.grant_referred_referral_bonus(
    target_referral.id,
    target_order.id,
    input_provider_payment_id
  );

  insert into public.product_events (user_id, event_name, route, metadata)
  values (
    target_referral.referrer_user_id,
    'referral_purchase_confirmed',
    '/api/payments/webhook',
    jsonb_build_object('referral_id', target_referral.id)
  );

  return target_referral;
end;
$$;

create or replace function public.process_pending_referral_rewards(
  target_referrer_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_referral public.referrals%rowtype;
  account public.credit_accounts;
  inserted_ledger public.credit_ledger%rowtype;
  processed_count integer := 0;
begin
  for target_referral in
    select *
    from public.referrals
    where status = 'pending_release'
      and referrer_reward_granted_at is null
      and reward_available_at <= now()
      and review_status = 'clear'
      and (target_referrer_user_id is null or referrer_user_id = target_referrer_user_id)
    order by reward_available_at, id
    for update skip locked
  loop
    inserted_ledger := null;

    select *
    into inserted_ledger
    from public.credit_ledger
    where reference_type = 'referral'
      and reference_id = target_referral.id
      and reason = 'referral_referrer_bonus'
    limit 1;

    if not found then
      account := public.ensure_referral_credit_account(target_referral.referrer_user_id);

      update public.credit_accounts
      set balance = balance + target_referral.referrer_reward_credits
      where user_id = target_referral.referrer_user_id
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
        target_referral.referrer_user_id,
        target_referral.referrer_reward_credits,
        account.balance,
        'referral_referrer_bonus',
        'referral',
        target_referral.id,
        jsonb_build_object(
          'referral_id', target_referral.id,
          'order_id', target_referral.order_id,
          'provider_payment_id', target_referral.provider_payment_id,
          'reward_role', 'referrer',
          'source', 'indique_e_ganhe'
        )
      )
      returning * into inserted_ledger;
    end if;

    update public.referrals
    set status = 'reward_granted',
        referrer_reward_granted_at = coalesce(referrer_reward_granted_at, now()),
        referrer_reward_ledger_id = coalesce(referrer_reward_ledger_id, inserted_ledger.id)
    where id = target_referral.id;

    insert into public.product_events (user_id, event_name, route, metadata)
    values (
      target_referral.referrer_user_id,
      'referral_bonus_granted',
      '/api/referrals/process-pending',
      jsonb_build_object(
        'referral_id', target_referral.id,
        'reward_role', 'referrer',
        'credits', target_referral.referrer_reward_credits
      )
    );

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$$;

create or replace function public.reverse_referral_bonus(
  target_referral_id uuid,
  target_user_id uuid,
  target_amount integer,
  target_reward_role text,
  target_order_id uuid,
  input_reason text
)
returns public.credit_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  account public.credit_accounts;
  reversal_ledger public.credit_ledger%rowtype;
  reversible_credits integer := 0;
begin
  if target_amount <= 0 or target_reward_role not in ('referrer', 'referred') then
    return null;
  end if;

  select *
  into reversal_ledger
  from public.credit_ledger
  where user_id = target_user_id
    and reference_type = 'referral'
    and reference_id = target_referral_id
    and reason = 'referral_bonus_reversal'
    and metadata ->> 'reward_role' = target_reward_role
  limit 1;

  if found then
    return reversal_ledger;
  end if;

  select *
  into account
  from public.credit_accounts
  where user_id = target_user_id
  for update;

  if not found then
    return null;
  end if;

  reversible_credits := least(account.balance, target_amount);

  if reversible_credits <= 0 then
    return null;
  end if;

  update public.credit_accounts
  set balance = balance - reversible_credits
  where user_id = target_user_id
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
    target_user_id,
    -reversible_credits,
    account.balance,
    'referral_bonus_reversal',
    'referral',
    target_referral_id,
    jsonb_build_object(
      'referral_id', target_referral_id,
      'order_id', target_order_id,
      'reward_role', target_reward_role,
      'intended_amount', target_amount,
      'reversed_amount', reversible_credits,
      'reason', input_reason,
      'source', 'indique_e_ganhe'
    )
  )
  returning * into reversal_ledger;

  return reversal_ledger;
end;
$$;

create or replace function public.cancel_or_reverse_referral_for_order(
  target_order_id uuid,
  target_status text default 'refunded'
)
returns public.referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  target_referral public.referrals%rowtype;
  referred_reversal public.credit_ledger%rowtype;
  referrer_reversal public.credit_ledger%rowtype;
  next_status text;
begin
  select *
  into target_referral
  from public.referrals
  where order_id = target_order_id
  for update;

  if not found then
    return null;
  end if;

  next_status := case
    when target_status in ('refunded', 'charged_back') then 'refunded'
    else 'cancelled'
  end;

  if target_referral.referred_reward_granted_at is not null then
    referred_reversal := public.reverse_referral_bonus(
      target_referral.id,
      target_referral.referred_user_id,
      target_referral.referred_bonus_credits,
      'referred',
      target_order_id,
      target_status
    );
  end if;

  if target_referral.referrer_reward_granted_at is not null then
    referrer_reversal := public.reverse_referral_bonus(
      target_referral.id,
      target_referral.referrer_user_id,
      target_referral.referrer_reward_credits,
      'referrer',
      target_order_id,
      target_status
    );
  end if;

  update public.referrals
  set status = next_status,
      cancelled_at = coalesce(cancelled_at, now()),
      cancellation_reason = coalesce(cancellation_reason, target_status),
      referred_reversal_ledger_id = coalesce(referred_reversal_ledger_id, referred_reversal.id),
      referrer_reversal_ledger_id = coalesce(referrer_reversal_ledger_id, referrer_reversal.id),
      metadata = metadata || jsonb_build_object(
        'latest_reversal_status', target_status,
        'referred_reversal_ledger_id', referred_reversal.id,
        'referrer_reversal_ledger_id', referrer_reversal.id
      )
  where id = target_referral.id
  returning * into target_referral;

  insert into public.product_events (user_id, event_name, route, metadata)
  values (
    target_referral.referrer_user_id,
    'referral_bonus_reversed',
    '/api/payments/webhook',
    jsonb_build_object('referral_id', target_referral.id, 'status', target_status)
  );

  return target_referral;
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
  account public.credit_accounts;
  purchase_ledger public.credit_ledger;
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
      expires_at = case
        when target_product.product_kind = 'access' then target_product.access_valid_until
        else target_order.expires_at
      end
  where id = target_order.id;

  if target_product.product_kind = 'credit_package' then
    if target_product.credit_amount is null or target_product.credit_amount <= 0 then
      raise exception 'invalid credit package';
    end if;

    insert into public.credit_accounts (user_id, balance, monthly_allowance)
    values (target_order.user_id, 50, 50)
    on conflict (user_id) do nothing;

    select *
    into account
    from public.credit_accounts
    where user_id = target_order.user_id
    for update;

    insert into public.credit_ledger (
      user_id,
      amount,
      balance_after,
      reason,
      reference_type,
      metadata
    )
    select
      target_order.user_id,
      account.monthly_allowance,
      account.balance,
      'initial_allowance',
      'credit_account',
      jsonb_build_object('cycle_started_at', account.cycle_started_at)
    where not exists (
      select 1
      from public.credit_ledger cl
      where cl.user_id = target_order.user_id
        and cl.reason = 'initial_allowance'
    );

    select *
    into purchase_ledger
    from public.credit_ledger
    where user_id = target_order.user_id
      and reason = 'purchase'
      and reference_type = 'order'
      and reference_id = target_order.id
    limit 1;

    if not found then
      update public.credit_accounts
      set balance = balance + target_product.credit_amount
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
        target_product.credit_amount,
        account.balance,
        'purchase',
        'order',
        target_order.id,
        jsonb_build_object(
          'product_id', target_product.id,
          'product_slug', target_product.slug,
          'amount_cents', target_order.amount_cents
        )
      );

      insert into public.product_events (user_id, event_name, route, metadata)
      values (
        target_order.user_id,
        'credit_package_purchased',
        '/api/payments/webhook',
        jsonb_build_object(
          'order_id', target_order.id,
          'credits', target_product.credit_amount
        )
      );
    end if;

    return;
  end if;

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

  perform public.process_referral_purchase_for_order(target_order.id, null);
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

  perform public.cancel_or_reverse_referral_for_order(target_order.id, target_status);
end;
$$;

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
      'practice_session_completed',
      'high_priority_training_started',
      'high_priority_question_completed',
      'simulation_started',
      'simulation_completed',
      'study_plan_generated',
      'study_plan_item_completed',
      'premium_block_seen',
      'beta_application_submitted',
      'feedback_submitted',
      'essay_submitted',
      'essay_corrected',
      'essay_cancelled',
      'ai_question_explanation_generated',
      'ai_performance_analysis_generated',
      'ai_study_plan_generated',
      'credit_package_purchased',
      'referral_link_copied',
      'referral_share_started',
      'signup_with_referral',
      'referral_purchase_confirmed',
      'referral_bonus_granted',
      'referral_bonus_reversed'
    )
  );

update public.legal_document_versions
set is_current = false
where document_type in ('terms_of_use', 'privacy_policy')
  and version <> '2026-07-24';

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
    '2026-07-24',
    '2026-07-24 00:00:00-03'::timestamptz,
    '50aa8c390912a6142f50722112817f2931dd977a3a3ccf0b854508613c4a69d5',
    true
  ),
  (
    'privacy_policy',
    '2026-07-24',
    '2026-07-24 00:00:00-03'::timestamptz,
    '32db8163b8428a114c8402c5911ea4f9e8a4a8fe59f05057c653f9475b7e7fb0',
    true
  )
on conflict (document_type, version) do update set
  effective_at = excluded.effective_at,
  content_hash = excluded.content_hash,
  is_current = excluded.is_current;

grant select on table public.referrals to authenticated;
grant select, insert, update, delete on table public.referrals to service_role;

grant execute on function public.resolve_referral_code(text) to anon, authenticated;
revoke execute on function public.ensure_referral_code(uuid) from public, anon;
grant execute on function public.ensure_referral_code(uuid) to authenticated, service_role;

revoke execute on function public.generate_unique_referral_code(text) from public, anon, authenticated;
revoke execute on function public.attach_referral_to_new_user(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.ensure_referral_credit_account(uuid) from public, anon, authenticated;
revoke execute on function public.grant_referred_referral_bonus(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.process_referral_purchase_for_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.process_pending_referral_rewards(uuid) from public, anon, authenticated;
revoke execute on function public.reverse_referral_bonus(uuid, uuid, integer, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.cancel_or_reverse_referral_for_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.grant_paid_access_for_order(uuid) from public, anon, authenticated;
revoke execute on function public.revoke_paid_access_for_order(uuid, text) from public, anon, authenticated;

grant execute on function public.attach_referral_to_new_user(uuid, text, text) to service_role;
grant execute on function public.ensure_referral_credit_account(uuid) to service_role;
grant execute on function public.grant_referred_referral_bonus(uuid, uuid, text) to service_role;
grant execute on function public.process_referral_purchase_for_order(uuid, text) to service_role;
grant execute on function public.process_pending_referral_rewards(uuid) to service_role;
grant execute on function public.reverse_referral_bonus(uuid, uuid, integer, text, uuid, text) to service_role;
grant execute on function public.cancel_or_reverse_referral_for_order(uuid, text) to service_role;
grant execute on function public.grant_paid_access_for_order(uuid) to service_role;
grant execute on function public.revoke_paid_access_for_order(uuid, text) to service_role;
