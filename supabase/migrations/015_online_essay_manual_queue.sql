-- 015: restore online essay submissions in the current manual correction queue.
--
-- The upload flow introduced in 014 remains unchanged. This migration updates
-- the online submission RPC so typed essays use the same pending queue,
-- idempotency, debit ledger, cancellation refund, and optional student note.

drop function if exists public.submit_essay_for_correction(uuid, text, text, text, text, integer, text, text, text);
drop function if exists public.submit_essay_for_correction(uuid, text, text, text, text, integer, text, text, text, text);

create or replace function public.submit_essay_for_correction(
  input_client_token uuid,
  input_theme text,
  input_delivery_type text,
  input_essay_text text default null,
  input_file_name text default null,
  input_file_size integer default null,
  input_file_type text default null,
  input_storage_bucket text default null,
  input_storage_path text default null,
  input_student_note text default null
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
  clean_theme text := nullif(btrim(coalesce(input_theme, '')), '');
  clean_note text := nullif(btrim(coalesce(input_student_note, '')), '');
  clean_text text := nullif(btrim(coalesce(input_essay_text, '')), '');
  account public.credit_accounts;
  inserted_ledger_id uuid;
  submission_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if input_client_token is null then
    raise exception 'missing client token';
  end if;

  if input_delivery_type <> 'online' then
    raise exception 'unsupported delivery type';
  end if;

  if clean_theme is not null and length(clean_theme) > 180 then
    raise exception 'invalid theme';
  end if;

  if clean_note is not null and length(clean_note) > 1000 then
    raise exception 'invalid student note';
  end if;

  if clean_text is null or length(clean_text) < 400 or length(clean_text) > 12000 then
    raise exception 'invalid essay text';
  end if;

  computed_word_count := array_length(regexp_split_to_array(clean_text, '\s+'), 1);
  if computed_word_count < 80 then
    raise exception 'invalid essay word count';
  end if;

  if not public.has_platform_access(current_user_id) then
    raise exception 'platform access required';
  end if;

  select id
  into submission_id
  from public.essay_submissions
  where user_id = current_user_id
    and client_token = input_client_token;

  if submission_id is not null then
    return submission_id;
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

  update public.credit_accounts
  set balance = balance - cost
  where user_id = current_user_id
  returning * into account;

  insert into public.essay_submissions (
    user_id,
    client_token,
    idempotency_key,
    theme,
    delivery_type,
    essay_text,
    word_count,
    credit_cost,
    status,
    file_count,
    student_note,
    submitted_at,
    confirmed_at,
    created_at
  )
  values (
    current_user_id,
    input_client_token,
    input_client_token,
    coalesce(clean_theme, 'Redacao sem tema'),
    'online',
    clean_text,
    computed_word_count,
    cost,
    'pending',
    0,
    clean_note,
    now(),
    now(),
    now()
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
      'delivery_type', 'online',
      'word_count', computed_word_count,
      'idempotency_key', input_client_token
    )
  )
  returning id into inserted_ledger_id;

  update public.essay_submissions
  set debit_ledger_id = inserted_ledger_id
  where id = submission_id;

  insert into public.essay_submission_events (
    submission_id,
    actor_id,
    event_type,
    to_status,
    metadata
  )
  values (
    submission_id,
    current_user_id,
    'submitted',
    'pending',
    jsonb_build_object(
      'delivery_type', 'online',
      'credit_cost', cost,
      'ledger_id', inserted_ledger_id,
      'word_count', computed_word_count
    )
  );

  insert into public.product_events (user_id, event_name, route, metadata)
  values (
    current_user_id,
    'essay_submitted',
    '/dashboard/correcao-redacao',
    jsonb_build_object(
      'delivery_type', 'online',
      'credit_cost', cost,
      'word_count', computed_word_count
    )
  );

  return submission_id;
end;
$$;

grant execute on function public.submit_essay_for_correction(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
) to authenticated;
