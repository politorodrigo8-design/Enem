-- 013: private essay storage and minimal manual queue compatibility.
--
-- This migration is intentionally small. It must be applicable directly after
-- 012_essay_corrections_and_credits.sql, which created the first credit-backed
-- essay queue. The detailed ENEM correction model previously attempted here
-- was removed from the active scope; 014 adds the new multi-file manual upload
-- flow and administrative assignment model.

create extension if not exists "pgcrypto";

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'essay-submissions',
  'essay-submissions',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg']::text[];

create or replace function public.is_admin(user_id uuid default auth.uid())
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
      and p.access_level = 'admin'
      and (p.access_expires_at is null or p.access_expires_at > now())
  );
$$;

alter table public.essay_submissions
  add column if not exists client_token uuid,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists refunded_by uuid references auth.users(id) on delete set null,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_ledger_id uuid references public.credit_ledger(id) on delete set null,
  add column if not exists cancellation_reason text;

update public.essay_submissions
set status = case status
  when 'queued' then 'pending'
  when 'processing' then 'in_review'
  when 'rejected' then 'cancelled'
  else status
end
where status in ('queued', 'processing', 'rejected');

alter table public.essay_submissions
  alter column status set default 'pending';

alter table public.essay_submissions
  drop constraint if exists essay_submissions_status_check,
  drop constraint if exists essay_submissions_upload_file_check,
  drop constraint if exists essay_submissions_storage_path_check,
  drop constraint if exists essay_submissions_competence_1_score_check,
  drop constraint if exists essay_submissions_competence_2_score_check,
  drop constraint if exists essay_submissions_competence_3_score_check,
  drop constraint if exists essay_submissions_competence_4_score_check,
  drop constraint if exists essay_submissions_competence_5_score_check,
  drop constraint if exists essay_submissions_total_score_check,
  drop constraint if exists essay_submissions_corrected_scores_check;

alter table public.essay_submissions
  add constraint essay_submissions_status_check
    check (status in ('pending', 'in_review', 'completed', 'cancelled')),
  add constraint essay_submissions_upload_file_check
    check (
      delivery_type <> 'upload'
      or (
        file_name is not null
        and length(btrim(file_name)) between 3 and 180
        and (
          storage_path is null
          or (
            storage_bucket = 'essay-submissions'
            and length(btrim(storage_path)) between 12 and 400
            and storage_path !~ '(^/|\\.\\.)'
          )
        )
      )
    );

create unique index if not exists essay_submissions_user_client_token_unique
  on public.essay_submissions (user_id, client_token)
  where client_token is not null;

create index if not exists essay_submissions_status_submitted_idx
  on public.essay_submissions (status, submitted_at asc);

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
      'purchase'
    )
  );

create table if not exists public.essay_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.essay_submissions(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (
    event_type in (
      'submitted',
      'status_changed',
      'correction_saved',
      'cancelled',
      'credits_refunded'
    )
  ),
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint essay_submission_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists essay_submission_events_submission_created_idx
  on public.essay_submission_events (submission_id, created_at desc);

alter table public.essay_submission_events enable row level security;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
for select to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "essay_submissions_select_own" on public.essay_submissions;
create policy "essay_submissions_select_own" on public.essay_submissions
for select to authenticated
using (
  (user_id = auth.uid() and public.has_platform_access(auth.uid()))
  or public.is_admin(auth.uid())
);

drop policy if exists "essay_submission_events_select_related" on public.essay_submission_events;
create policy "essay_submission_events_select_related" on public.essay_submission_events
for select to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.essay_submissions es
    where es.id = submission_id
      and es.user_id = auth.uid()
      and public.has_platform_access(auth.uid())
  )
);

drop policy if exists "essay_files_insert_own" on storage.objects;
create policy "essay_files_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'essay-submissions'
  and split_part(name, '/', 1) = auth.uid()::text
  and public.has_platform_access(auth.uid())
);

drop policy if exists "essay_files_select_authorized" on storage.objects;
create policy "essay_files_select_authorized" on storage.objects
for select to authenticated
using (
  bucket_id = 'essay-submissions'
  and (
    (split_part(name, '/', 1) = auth.uid()::text and public.has_platform_access(auth.uid()))
    or public.is_admin(auth.uid())
  )
);

drop policy if exists "essay_files_delete_own" on storage.objects;
create policy "essay_files_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'essay-submissions'
  and split_part(name, '/', 1) = auth.uid()::text
  and public.has_platform_access(auth.uid())
);

drop function if exists public.submit_essay_for_correction(text, text, text, text, integer, text);
drop function if exists public.submit_essay_for_correction(uuid, text, text, text, text, integer, text, text, text);

create or replace function public.submit_essay_for_correction(
  input_client_token uuid,
  input_theme text,
  input_delivery_type text,
  input_essay_text text default null,
  input_file_name text default null,
  input_file_size integer default null,
  input_file_type text default null,
  input_storage_bucket text default null,
  input_storage_path text default null
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

  if input_client_token is null then
    raise exception 'missing client token';
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

  if input_delivery_type = 'online' and input_essay_text is not null and btrim(input_essay_text) <> '' then
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
    client_token,
    theme,
    delivery_type,
    essay_text,
    file_name,
    file_size,
    file_type,
    storage_bucket,
    storage_path,
    word_count,
    credit_cost,
    status
  )
  values (
    current_user_id,
    input_client_token,
    btrim(input_theme),
    input_delivery_type,
    nullif(btrim(coalesce(input_essay_text, '')), ''),
    nullif(btrim(coalesce(input_file_name, '')), ''),
    input_file_size,
    nullif(btrim(coalesce(input_file_type, '')), ''),
    nullif(btrim(coalesce(input_storage_bucket, '')), ''),
    nullif(btrim(coalesce(input_storage_path, '')), ''),
    coalesce(computed_word_count, 0),
    cost,
    'pending'
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
      'word_count', coalesce(computed_word_count, 0),
      'has_file', input_storage_path is not null
    )
  );

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
    jsonb_build_object('delivery_type', input_delivery_type, 'credit_cost', cost)
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

create or replace function public.admin_set_essay_in_review(input_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_admin_id uuid := auth.uid();
  previous_status text;
begin
  if not public.is_admin(current_admin_id) then
    raise exception 'admin access required';
  end if;

  select status
  into previous_status
  from public.essay_submissions
  where id = input_submission_id
  for update;

  if previous_status is null then
    raise exception 'essay submission not found';
  end if;

  if previous_status in ('completed', 'cancelled') then
    raise exception 'finalized submission cannot enter review';
  end if;

  if previous_status <> 'in_review' then
    update public.essay_submissions
    set status = 'in_review'
    where id = input_submission_id;

    insert into public.essay_submission_events (
      submission_id,
      actor_id,
      event_type,
      from_status,
      to_status
    )
    values (
      input_submission_id,
      current_admin_id,
      'status_changed',
      previous_status,
      'in_review'
    );
  end if;
end;
$$;

drop function if exists public.admin_save_essay_correction(
  uuid,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz
);

create or replace function public.admin_cancel_essay_submission(
  input_submission_id uuid,
  input_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_admin_id uuid := auth.uid();
  submission public.essay_submissions;
  account public.credit_accounts;
  inserted_ledger_id uuid;
begin
  if not public.is_admin(current_admin_id) then
    raise exception 'admin access required';
  end if;

  select *
  into submission
  from public.essay_submissions
  where id = input_submission_id
  for update;

  if submission.id is null then
    raise exception 'essay submission not found';
  end if;

  if submission.status = 'completed' then
    raise exception 'completed submission cannot be cancelled';
  end if;

  if submission.refund_ledger_id is null then
    insert into public.credit_accounts (user_id, balance, monthly_allowance)
    values (submission.user_id, 50, 50)
    on conflict (user_id) do nothing;

    select *
    into account
    from public.credit_accounts
    where user_id = submission.user_id
    for update;

    update public.credit_accounts
    set balance = balance + submission.credit_cost
    where user_id = submission.user_id
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
      submission.user_id,
      submission.credit_cost,
      account.balance,
      'essay_refund',
      'essay_submission',
      submission.id,
      jsonb_build_object(
        'cancelled_by', current_admin_id,
        'reason', nullif(btrim(coalesce(input_reason, '')), '')
      )
    )
    returning id into inserted_ledger_id;

    insert into public.essay_submission_events (
      submission_id,
      actor_id,
      event_type,
      from_status,
      to_status,
      metadata
    )
    values (
      submission.id,
      current_admin_id,
      'credits_refunded',
      submission.status,
      'cancelled',
      jsonb_build_object('ledger_id', inserted_ledger_id, 'amount', submission.credit_cost)
    );
  else
    inserted_ledger_id := submission.refund_ledger_id;
  end if;

  update public.essay_submissions
  set
    status = 'cancelled',
    cancellation_reason = nullif(btrim(coalesce(input_reason, '')), ''),
    refunded_by = coalesce(refunded_by, current_admin_id),
    refunded_at = coalesce(refunded_at, now()),
    refund_ledger_id = coalesce(refund_ledger_id, inserted_ledger_id)
  where id = submission.id;

  insert into public.essay_submission_events (
    submission_id,
    actor_id,
    event_type,
    from_status,
    to_status,
    metadata
  )
  values (
    submission.id,
    current_admin_id,
    'cancelled',
    submission.status,
    'cancelled',
    jsonb_build_object(
      'reason', nullif(btrim(coalesce(input_reason, '')), ''),
      'refund_ledger_id', inserted_ledger_id
    )
  );
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
      'essay_cancelled'
    )
  );

grant select on table public.essay_submission_events to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.submit_essay_for_correction(uuid, text, text, text, text, integer, text, text, text)
  to authenticated;
grant execute on function public.admin_set_essay_in_review(uuid) to authenticated;
grant execute on function public.admin_cancel_essay_submission(uuid, text) to authenticated;

grant select, insert, update, delete on table public.essay_submission_events to service_role;
grant all on table storage.objects to service_role;
grant select, insert, update on table storage.buckets to service_role;
