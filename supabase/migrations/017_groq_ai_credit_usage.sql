-- 017: Groq-backed AI credit usage.
--
-- AI calls debit credits through one SECURITY DEFINER RPC after the model
-- response succeeds, keeping balance changes auditable in credit_ledger.

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
      'ai_study_plan'
    )
  );

create or replace function public.spend_ai_credits(
  input_operation text,
  input_cost integer,
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

  if input_cost <> expected_cost then
    raise exception 'invalid ai cost';
  end if;

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
    input_metadata
  )
  returning * into inserted_ledger;

  return inserted_ledger;
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
      'essay_submitted',
      'essay_corrected',
      'essay_cancelled',
      'ai_question_explanation_generated',
      'ai_performance_analysis_generated',
      'ai_study_plan_generated'
    )
  );

grant execute on function public.spend_ai_credits(text, integer, text, uuid, jsonb)
  to authenticated;
