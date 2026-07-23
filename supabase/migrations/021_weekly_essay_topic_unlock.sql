-- 021: charge a small credit cost to unlock the weekly essay proposal.

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
      'ai_credit_refund',
      'weekly_essay_topic'
    )
  );

create unique index if not exists credit_ledger_one_weekly_essay_topic_unlock_unique
  on public.credit_ledger (user_id, ((metadata ->> 'topic_id')))
  where reason = 'weekly_essay_topic';

create or replace function public.unlock_weekly_essay_topic(
  input_topic_id text,
  input_topic_title text default null
)
returns public.credit_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_topic_id text := lower(btrim(coalesce(input_topic_id, '')));
  topic_title text := nullif(left(btrim(coalesce(input_topic_title, '')), 200), '');
  cost integer := 1;
  account public.credit_accounts;
  existing_ledger public.credit_ledger;
  inserted_ledger public.credit_ledger;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_platform_access(current_user_id) then
    raise exception 'platform access required';
  end if;

  if normalized_topic_id !~ '^[a-z0-9][a-z0-9_-]{2,119}$' then
    raise exception 'invalid weekly essay topic';
  end if;

  perform public.ensure_credit_account(current_user_id);

  select *
  into account
  from public.credit_accounts
  where user_id = current_user_id
  for update;

  select *
  into existing_ledger
  from public.credit_ledger
  where user_id = current_user_id
    and reason = 'weekly_essay_topic'
    and metadata ->> 'topic_id' = normalized_topic_id
  limit 1;

  if found then
    return existing_ledger;
  end if;

  if account.balance < cost then
    raise exception 'insufficient credits';
  end if;

  update public.credit_accounts
  set balance = balance - cost
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
    -cost,
    account.balance,
    'weekly_essay_topic',
    'weekly_essay_topic',
    null,
    jsonb_build_object(
      'topic_id', normalized_topic_id,
      'topic_title', topic_title,
      'credit_cost', cost,
      'unlocked_at', now()
    )
  )
  returning * into inserted_ledger;

  return inserted_ledger;
end;
$$;

grant execute on function public.unlock_weekly_essay_topic(text, text)
  to authenticated;
