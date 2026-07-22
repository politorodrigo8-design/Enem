-- 012: credit ledger and essay correction queue.
--
-- Credits are deliberately ledger-based: the current balance lives in
-- credit_accounts, while every debit/credit is auditable in credit_ledger.
-- Essay submission uses one SECURITY DEFINER RPC so the credit debit and the
-- queue record are committed atomically.

create extension if not exists "pgcrypto";

create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 50,
  monthly_allowance integer not null default 50,
  cycle_started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_accounts_balance_check check (balance >= 0),
  constraint credit_accounts_monthly_allowance_check check (monthly_allowance >= 0)
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (
    reason in (
      'initial_allowance',
      'essay_correction',
      'manual_adjustment',
      'training_reward',
      'simulation_reward',
      'study_plan_reward',
      'purchase'
    )
  ),
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint credit_ledger_amount_not_zero check (amount <> 0),
  constraint credit_ledger_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.essay_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null,
  delivery_type text not null check (delivery_type in ('online', 'upload')),
  essay_text text,
  file_name text,
  file_size integer,
  file_type text,
  word_count integer not null default 0,
  credit_cost integer not null default 10 check (credit_cost > 0),
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'completed', 'rejected', 'cancelled')
  ),
  scores jsonb,
  feedback jsonb,
  reviewer_notes text,
  submitted_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint essay_submissions_theme_length_check
    check (length(btrim(theme)) between 8 and 180),
  constraint essay_submissions_online_text_check
    check (
      delivery_type <> 'online'
      or (
        essay_text is not null
        and word_count >= 80
        and length(btrim(essay_text)) between 400 and 12000
      )
    ),
  constraint essay_submissions_upload_file_check
    check (
      delivery_type <> 'upload'
      or (
        file_name is not null
        and length(btrim(file_name)) between 3 and 180
      )
    ),
  constraint essay_submissions_scores_object_check
    check (scores is null or jsonb_typeof(scores) = 'object'),
  constraint essay_submissions_feedback_object_check
    check (feedback is null or jsonb_typeof(feedback) = 'object')
);

drop trigger if exists credit_accounts_set_updated_at on public.credit_accounts;
create trigger credit_accounts_set_updated_at
before update on public.credit_accounts
for each row execute function public.set_updated_at();

drop trigger if exists essay_submissions_set_updated_at on public.essay_submissions;
create trigger essay_submissions_set_updated_at
before update on public.essay_submissions
for each row execute function public.set_updated_at();

create index if not exists credit_ledger_user_created_at_idx
  on public.credit_ledger (user_id, created_at desc);

create index if not exists essay_submissions_user_submitted_at_idx
  on public.essay_submissions (user_id, submitted_at desc);

alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.essay_submissions enable row level security;

drop policy if exists "credit_accounts_select_own" on public.credit_accounts;
create policy "credit_accounts_select_own" on public.credit_accounts
for select to authenticated
using (user_id = auth.uid() and public.has_platform_access(auth.uid()));

drop policy if exists "credit_ledger_select_own" on public.credit_ledger;
create policy "credit_ledger_select_own" on public.credit_ledger
for select to authenticated
using (user_id = auth.uid() and public.has_platform_access(auth.uid()));

drop policy if exists "essay_submissions_select_own" on public.essay_submissions;
create policy "essay_submissions_select_own" on public.essay_submissions
for select to authenticated
using (user_id = auth.uid() and public.has_platform_access(auth.uid()));

create or replace function public.ensure_credit_account(target_user_id uuid)
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

  if auth.uid() is null or target_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  if not public.has_platform_access(target_user_id) then
    raise exception 'platform access required';
  end if;

  insert into public.credit_accounts (user_id, balance, monthly_allowance)
  values (target_user_id, 50, 50)
  on conflict (user_id) do nothing;

  select *
  into account
  from public.credit_accounts
  where user_id = target_user_id;

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

create or replace function public.submit_essay_for_correction(
  input_theme text,
  input_delivery_type text,
  input_essay_text text default null,
  input_file_name text default null,
  input_file_size integer default null,
  input_file_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  cost integer := 10;
  computed_word_count integer := 0;
  account public.credit_accounts;
  submission_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_platform_access(current_user_id) then
    raise exception 'platform access required';
  end if;

  perform public.ensure_credit_account(current_user_id);

  select *
  into account
  from public.credit_accounts
  where user_id = current_user_id
  for update;

  if account.balance < cost then
    raise exception 'insufficient credits';
  end if;

  if input_delivery_type = 'online' and input_essay_text is not null then
    computed_word_count := array_length(
      regexp_split_to_array(btrim(input_essay_text), '\s+'),
      1
    );
  end if;

  update public.credit_accounts
  set balance = balance - cost
  where user_id = current_user_id
  returning * into account;

  insert into public.essay_submissions (
    user_id,
    theme,
    delivery_type,
    essay_text,
    file_name,
    file_size,
    file_type,
    word_count,
    credit_cost
  )
  values (
    current_user_id,
    btrim(input_theme),
    input_delivery_type,
    nullif(btrim(coalesce(input_essay_text, '')), ''),
    nullif(btrim(coalesce(input_file_name, '')), ''),
    input_file_size,
    nullif(btrim(coalesce(input_file_type, '')), ''),
    coalesce(computed_word_count, 0),
    cost
  )
  returning id into submission_id;

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
    current_user_id,
    -cost,
    account.balance,
    'essay_correction',
    'essay_submission',
    submission_id,
    jsonb_build_object(
      'delivery_type', input_delivery_type,
      'word_count', coalesce(computed_word_count, 0)
    )
  );

  insert into public.product_events (user_id, event_name, route, metadata)
  values (
    current_user_id,
    'essay_submitted',
    '/dashboard/correcao-redacao',
    jsonb_build_object(
      'delivery_type', input_delivery_type,
      'credit_cost', cost,
      'word_count', coalesce(computed_word_count, 0)
    )
  );

  return submission_id;
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
      'high_priority_training_started',
      'high_priority_question_completed',
      'simulation_started',
      'simulation_completed',
      'study_plan_generated',
      'study_plan_item_completed',
      'premium_block_seen',
      'beta_application_submitted',
      'feedback_submitted',
      'essay_submitted'
    )
  );

grant select on table public.credit_accounts, public.credit_ledger, public.essay_submissions
  to authenticated;

grant execute on function public.ensure_credit_account(uuid) to authenticated;
grant execute on function public.submit_essay_for_correction(text, text, text, text, integer, text)
  to authenticated;

grant select, insert, update, delete on table public.credit_accounts,
  public.credit_ledger,
  public.essay_submissions
  to service_role;
