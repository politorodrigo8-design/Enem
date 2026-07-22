-- Reserve AI credits before calling the provider, then confirm or refund.

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
      'ai_question_explanation',
      'ai_performance_analysis',
      'ai_study_plan',
      'ai_credit_refund'
    )
  );

create unique index if not exists credit_ledger_one_ai_refund_unique
  on public.credit_ledger (related_ledger_id)
  where reason = 'ai_credit_refund';

create or replace function public.reserve_ai_credits(
  input_operation text,
  input_reference_type text default null,
  input_reference_id uuid default null,
  input_metadata jsonb default '{}'::jsonb
)
returns public.credit_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_operation text := btrim(coalesce(input_operation, ''));
  expected_cost integer;
  ledger_reason text;
  account public.credit_accounts;
  inserted_ledger public.credit_ledger;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_platform_access(current_user_id) then
    raise exception 'platform access required';
  end if;

  case normalized_operation
    when 'question_explanation' then
      expected_cost := 1;
      ledger_reason := 'ai_question_explanation';
    when 'performance_analysis' then
      expected_cost := 2;
      ledger_reason := 'ai_performance_analysis';
    when 'study_plan' then
      expected_cost := 2;
      ledger_reason := 'ai_study_plan';
    else
      raise exception 'invalid ai operation';
  end case;

  if input_metadata is null or jsonb_typeof(input_metadata) <> 'object' then
    raise exception 'invalid ai metadata';
  end if;

  perform public.ensure_credit_account(current_user_id);

  select *
  into account
  from public.credit_accounts
  where user_id = current_user_id
  for update;

  if account.balance < expected_cost then
    raise exception 'insufficient credits';
  end if;

  update public.credit_accounts
  set balance = balance - expected_cost
  where user_id = current_user_id
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
    current_user_id,
    -expected_cost,
    account.balance,
    ledger_reason,
    nullif(btrim(coalesce(input_reference_type, '')), ''),
    input_reference_id,
    input_metadata || jsonb_build_object(
      'ai_status', 'reserved',
      'operation', normalized_operation,
      'reserved_at', now()
    )
  )
  returning * into inserted_ledger;

  return inserted_ledger;
end;
$$;

create or replace function public.confirm_ai_credit_reservation(
  input_ledger_id uuid,
  input_metadata jsonb default '{}'::jsonb
)
returns public.credit_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  reservation public.credit_ledger;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if input_metadata is null or jsonb_typeof(input_metadata) <> 'object' then
    raise exception 'invalid ai metadata';
  end if;

  select *
  into reservation
  from public.credit_ledger
  where id = input_ledger_id
    and user_id = current_user_id
    and amount < 0
    and reason in ('ai_question_explanation', 'ai_performance_analysis', 'ai_study_plan')
  for update;

  if not found then
    raise exception 'ai reservation not found';
  end if;

  if reservation.metadata ->> 'ai_status' = 'refunded' then
    raise exception 'ai reservation already refunded';
  end if;

  if reservation.metadata ->> 'ai_status' = 'confirmed' then
    return reservation;
  end if;

  update public.credit_ledger
  set metadata =
    reservation.metadata
    || input_metadata
    || jsonb_build_object('ai_status', 'confirmed', 'confirmed_at', now())
  where id = reservation.id
  returning * into reservation;

  return reservation;
end;
$$;

create or replace function public.refund_ai_credit_reservation(
  input_ledger_id uuid,
  input_reason text default 'provider_failed'
)
returns public.credit_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  reservation public.credit_ledger;
  refund public.credit_ledger;
  account public.credit_accounts;
  refund_amount integer;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  select *
  into reservation
  from public.credit_ledger
  where id = input_ledger_id
    and user_id = current_user_id
    and amount < 0
    and reason in ('ai_question_explanation', 'ai_performance_analysis', 'ai_study_plan')
  for update;

  if not found then
    raise exception 'ai reservation not found';
  end if;

  select *
  into refund
  from public.credit_ledger
  where related_ledger_id = reservation.id
    and reason = 'ai_credit_refund'
  limit 1;

  if found then
    return refund;
  end if;

  if reservation.metadata ->> 'ai_status' = 'confirmed' then
    raise exception 'ai reservation already confirmed';
  end if;

  refund_amount := abs(reservation.amount);

  select *
  into account
  from public.credit_accounts
  where user_id = current_user_id
  for update;

  update public.credit_accounts
  set balance = balance + refund_amount
  where user_id = current_user_id
  returning * into account;

  insert into public.credit_ledger (
    user_id,
    amount,
    balance_after,
    reason,
    reference_type,
    reference_id,
    related_ledger_id,
    metadata
  )
  values (
    current_user_id,
    refund_amount,
    account.balance,
    'ai_credit_refund',
    'ai_credit_reservation',
    reservation.id,
    reservation.id,
    jsonb_build_object(
      'reason', nullif(btrim(coalesce(input_reason, '')), ''),
      'refunded_at', now()
    )
  )
  returning * into refund;

  update public.credit_ledger
  set metadata = reservation.metadata || jsonb_build_object(
    'ai_status', 'refunded',
    'refunded_at', now(),
    'refund_ledger_id', refund.id
  )
  where id = reservation.id;

  return refund;
end;
$$;

grant execute on function public.reserve_ai_credits(text, text, uuid, jsonb)
  to authenticated;

grant execute on function public.confirm_ai_credit_reservation(uuid, jsonb)
  to authenticated;

grant execute on function public.refund_ai_credit_reservation(uuid, text)
  to authenticated;
