-- 014: manual essay upload queue, multi-file storage metadata, and safe credits.
--
-- This migration corrects the essay scope incrementally. It keeps previously
-- created columns for compatibility, but the active submission flow is now:
-- uploading -> pending -> in_review -> completed/cancelled.

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

alter table public.credit_ledger
  add column if not exists related_ledger_id uuid references public.credit_ledger(id) on delete set null;

alter table public.essay_submissions
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists confirmed_at timestamptz,
  add column if not exists idempotency_key uuid,
  add column if not exists file_count integer not null default 0,
  add column if not exists student_note text,
  add column if not exists debit_ledger_id uuid references public.credit_ledger(id) on delete set null,
  add column if not exists assigned_admin_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists completed_by uuid references auth.users(id) on delete set null,
  add column if not exists upload_failed_at timestamptz,
  add column if not exists upload_failure_reason text;

update public.essay_submissions
set
  created_at = coalesce(created_at, submitted_at),
  confirmed_at = coalesce(confirmed_at, submitted_at),
  idempotency_key = coalesce(idempotency_key, client_token),
  file_count = case
    when file_count > 0 then file_count
    when storage_path is not null then 1
    else 0
  end;

update public.essay_submissions
set status = case status
  when 'queued' then 'pending'
  when 'processing' then 'in_review'
  when 'corrected' then 'completed'
  when 'rejected' then 'cancelled'
  else status
end
where status in ('queued', 'processing', 'corrected', 'rejected');

alter table public.essay_submissions
  alter column status set default 'uploading';

alter table public.essay_submissions
  drop constraint if exists essay_submissions_status_check,
  drop constraint if exists essay_submissions_theme_length_check,
  drop constraint if exists essay_submissions_online_text_check,
  drop constraint if exists essay_submissions_upload_file_check,
  drop constraint if exists essay_submissions_corrected_scores_check,
  drop constraint if exists essay_submissions_file_count_check,
  drop constraint if exists essay_submissions_theme_optional_check,
  drop constraint if exists essay_submissions_student_note_check,
  drop constraint if exists essay_submissions_credit_cost_check,
  drop constraint if exists essay_submissions_idempotency_key_check;

alter table public.essay_submissions
  add constraint essay_submissions_status_check
    check (status in ('uploading', 'pending', 'in_review', 'completed', 'cancelled', 'upload_failed')),
  add constraint essay_submissions_theme_optional_check
    check (theme is not null and length(btrim(theme)) between 1 and 180),
  add constraint essay_submissions_student_note_check
    check (student_note is null or length(btrim(student_note)) <= 1000),
  add constraint essay_submissions_credit_cost_check
    check (credit_cost = 10),
  add constraint essay_submissions_file_count_check
    check (file_count between 0 and 4),
  add constraint essay_submissions_idempotency_key_check
    check (idempotency_key is null or idempotency_key = client_token);

create unique index if not exists essay_submissions_user_idempotency_key_unique
  on public.essay_submissions (user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists essay_submissions_assigned_admin_idx
  on public.essay_submissions (assigned_admin_id)
  where assigned_admin_id is not null;

create table if not exists public.essay_submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.essay_submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'essay-submissions',
  storage_path text not null unique,
  page_order integer not null check (page_order between 1 and 4),
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  original_name text,
  uploaded_at timestamptz not null default now(),
  constraint essay_submission_files_bucket_check check (storage_bucket = 'essay-submissions'),
  constraint essay_submission_files_path_check check (
    storage_path ~ ('^essays/' || user_id::text || '/' || submission_id::text || '/[1-4]-[0-9a-f-]{36}\\.(pdf|png|jpg)$')
  ),
  constraint essay_submission_files_original_name_check check (
    original_name is null or length(btrim(original_name)) between 1 and 180
  ),
  unique (submission_id, page_order)
);

create index if not exists essay_submission_files_submission_order_idx
  on public.essay_submission_files (submission_id, page_order);

alter table public.essay_submission_files enable row level security;

insert into public.essay_submission_files (
  submission_id,
  user_id,
  storage_bucket,
  storage_path,
  page_order,
  mime_type,
  size_bytes,
  original_name,
  uploaded_at
)
select
  es.id,
  es.user_id,
  coalesce(es.storage_bucket, 'essay-submissions'),
  es.storage_path,
  1,
  coalesce(nullif(es.file_type, ''), 'application/pdf'),
  coalesce(es.file_size, 1),
  es.file_name,
  coalesce(es.confirmed_at, es.submitted_at, es.created_at, now())
from public.essay_submissions es
where es.storage_path is not null
  and es.storage_path like 'essays/%'
  and not exists (
    select 1
    from public.essay_submission_files esf
    where esf.submission_id = es.id
  );

create table if not exists public.essay_correction_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.essay_submissions(id) on delete cascade,
  general_text text,
  result_storage_bucket text,
  result_storage_path text,
  created_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint essay_correction_results_general_text_check
    check (general_text is null or length(btrim(general_text)) <= 8000),
  constraint essay_correction_results_storage_check
    check (
      result_storage_path is null
      or (
        result_storage_bucket = 'essay-submissions'
        and result_storage_path !~ '(^/|\\.\\.)'
      )
    )
);

drop trigger if exists essay_correction_results_set_updated_at on public.essay_correction_results;
create trigger essay_correction_results_set_updated_at
before update on public.essay_correction_results
for each row execute function public.set_updated_at();

alter table public.essay_correction_results enable row level security;

drop policy if exists "essay_submission_files_select_related" on public.essay_submission_files;
create policy "essay_submission_files_select_related" on public.essay_submission_files
for select to authenticated
using (
  (user_id = auth.uid() and public.has_platform_access(auth.uid()))
  or public.is_admin(auth.uid())
);

drop policy if exists "essay_submission_files_insert_own_uploading" on public.essay_submission_files;
create policy "essay_submission_files_insert_own_uploading" on public.essay_submission_files
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.has_platform_access(auth.uid())
  and exists (
    select 1
    from public.essay_submissions es
    where es.id = submission_id
      and es.user_id = auth.uid()
      and es.status = 'uploading'
  )
);

drop policy if exists "essay_submission_files_delete_own_unconfirmed" on public.essay_submission_files;
create policy "essay_submission_files_delete_own_unconfirmed" on public.essay_submission_files
for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.essay_submissions es
    where es.id = submission_id
      and es.user_id = auth.uid()
      and es.status in ('uploading', 'upload_failed')
  )
);

drop policy if exists "essay_correction_results_select_related" on public.essay_correction_results;
create policy "essay_correction_results_select_related" on public.essay_correction_results
for select to authenticated
using (
  public.is_admin(auth.uid())
  or exists (
    select 1
    from public.essay_submissions es
    where es.id = submission_id
      and es.user_id = auth.uid()
      and es.status = 'completed'
      and public.has_platform_access(auth.uid())
  )
);

drop policy if exists "essay_files_insert_own" on storage.objects;
create policy "essay_files_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'essay-submissions'
  and split_part(name, '/', 1) = 'essays'
  and split_part(name, '/', 2) = auth.uid()::text
  and public.has_platform_access(auth.uid())
);

drop policy if exists "essay_files_select_authorized" on storage.objects;
create policy "essay_files_select_authorized" on storage.objects
for select to authenticated
using (
  bucket_id = 'essay-submissions'
  and (
    (
      split_part(name, '/', 1) = 'essays'
      and split_part(name, '/', 2) = auth.uid()::text
      and public.has_platform_access(auth.uid())
    )
    or public.is_admin(auth.uid())
  )
);

drop policy if exists "essay_files_delete_own" on storage.objects;
create policy "essay_files_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'essay-submissions'
  and split_part(name, '/', 1) = 'essays'
  and split_part(name, '/', 2) = auth.uid()::text
  and public.has_platform_access(auth.uid())
);

drop policy if exists "essay_submissions_select_own" on public.essay_submissions;
create policy "essay_submissions_select_own" on public.essay_submissions
for select to authenticated
using (
  (user_id = auth.uid() and public.has_platform_access(auth.uid()))
  or public.is_admin(auth.uid())
);

drop function if exists public.initiate_essay_submission(uuid, text, text, integer);
create or replace function public.initiate_essay_submission(
  input_idempotency_key uuid,
  input_theme text default null,
  input_student_note text default null,
  input_expected_file_count integer default null
)
returns table (submission_id uuid, submission_status text, already_confirmed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing public.essay_submissions;
  clean_theme text := nullif(btrim(coalesce(input_theme, '')), '');
  clean_note text := nullif(btrim(coalesce(input_student_note, '')), '');
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if input_idempotency_key is null then
    raise exception 'missing idempotency key';
  end if;

  if input_expected_file_count is null or input_expected_file_count < 1 or input_expected_file_count > 4 then
    raise exception 'invalid file count';
  end if;

  if clean_theme is not null and length(clean_theme) > 180 then
    raise exception 'invalid theme';
  end if;

  if clean_note is not null and length(clean_note) > 1000 then
    raise exception 'invalid student note';
  end if;

  if not public.has_platform_access(current_user_id) then
    raise exception 'platform access required';
  end if;

  select *
  into existing
  from public.essay_submissions
  where user_id = current_user_id
    and idempotency_key = input_idempotency_key
  for update;

  if existing.id is not null then
    submission_id := existing.id;
    submission_status := existing.status;
    already_confirmed := existing.status in ('pending', 'in_review', 'completed', 'cancelled');
    return next;
    return;
  end if;

  insert into public.essay_submissions (
    user_id,
    client_token,
    idempotency_key,
    theme,
    student_note,
    delivery_type,
    word_count,
    credit_cost,
    status,
    file_count,
    submitted_at,
    created_at
  )
  values (
    current_user_id,
    input_idempotency_key,
    input_idempotency_key,
    coalesce(clean_theme, 'Redacao sem tema'),
    clean_note,
    'upload',
    0,
    10,
    'uploading',
    input_expected_file_count,
    now(),
    now()
  )
  returning id, status into submission_id, submission_status;

  already_confirmed := false;
  return next;
end;
$$;

drop function if exists public.confirm_essay_submission(uuid, uuid, integer);
create or replace function public.confirm_essay_submission(
  input_submission_id uuid,
  input_idempotency_key uuid,
  input_expected_file_count integer
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  current_user_id uuid := auth.uid();
  cost integer := 10;
  submission public.essay_submissions;
  account public.credit_accounts;
  uploaded_count integer;
  total_size bigint;
  pdf_count integer;
  first_order integer;
  last_order integer;
  distinct_orders integer;
  missing_objects integer;
  inserted_ledger_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if input_idempotency_key is null then
    raise exception 'missing idempotency key';
  end if;

  if input_expected_file_count is null or input_expected_file_count < 1 or input_expected_file_count > 4 then
    raise exception 'invalid file count';
  end if;

  if not public.has_platform_access(current_user_id) then
    raise exception 'platform access required';
  end if;

  select *
  into submission
  from public.essay_submissions
  where id = input_submission_id
    and user_id = current_user_id
    and idempotency_key = input_idempotency_key
  for update;

  if submission.id is null then
    raise exception 'essay submission not found';
  end if;

  if submission.status in ('pending', 'in_review', 'completed', 'cancelled') then
    return submission.id;
  end if;

  if submission.status <> 'uploading' then
    raise exception 'submission cannot be confirmed';
  end if;

  select
    count(*),
    coalesce(sum(size_bytes), 0),
    count(*) filter (where mime_type = 'application/pdf'),
    min(page_order),
    max(page_order),
    count(distinct page_order)
  into uploaded_count, total_size, pdf_count, first_order, last_order, distinct_orders
  from public.essay_submission_files
  where submission_id = submission.id
    and user_id = current_user_id;

  if uploaded_count <> input_expected_file_count then
    raise exception 'missing uploaded files';
  end if;

  if total_size > 31457280 then
    raise exception 'total upload size exceeded';
  end if;

  if pdf_count > 0 and uploaded_count > 1 then
    raise exception 'pdf must be a single file';
  end if;

  if first_order <> 1 or last_order <> uploaded_count or distinct_orders <> uploaded_count then
    raise exception 'invalid page order';
  end if;

  select count(*)
  into missing_objects
  from public.essay_submission_files f
  left join storage.objects o
    on o.bucket_id = f.storage_bucket
   and o.name = f.storage_path
  where f.submission_id = submission.id
    and f.user_id = current_user_id
    and o.id is null;

  if missing_objects > 0 then
    raise exception 'missing uploaded files';
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
    submission.id,
    jsonb_build_object(
      'file_count', uploaded_count,
      'idempotency_key', input_idempotency_key
    )
  )
  returning id into inserted_ledger_id;

  update public.essay_submissions
  set
    status = 'pending',
    confirmed_at = now(),
    submitted_at = now(),
    file_count = uploaded_count,
    debit_ledger_id = inserted_ledger_id,
    storage_bucket = 'essay-submissions',
    storage_path = null,
    file_name = null,
    file_size = null,
    file_type = null
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
    current_user_id,
    'submitted',
    'uploading',
    'pending',
    jsonb_build_object(
      'credit_cost', cost,
      'ledger_id', inserted_ledger_id,
      'file_count', uploaded_count
    )
  );

  insert into public.product_events (user_id, event_name, route, metadata)
  values (
    current_user_id,
    'essay_submitted',
    '/dashboard/correcao-redacao',
    jsonb_build_object('credit_cost', cost, 'file_count', uploaded_count)
  );

  return submission.id;
end;
$$;

drop function if exists public.mark_essay_upload_failed(uuid, uuid, text);
create or replace function public.mark_essay_upload_failed(
  input_submission_id uuid,
  input_idempotency_key uuid,
  input_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  previous_status text;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  select status
  into previous_status
  from public.essay_submissions
  where id = input_submission_id
    and user_id = current_user_id
    and idempotency_key = input_idempotency_key
  for update;

  if previous_status is null then
    raise exception 'essay submission not found';
  end if;

  if previous_status <> 'uploading' then
    return;
  end if;

  update public.essay_submissions
  set
    status = 'upload_failed',
    upload_failed_at = now(),
    upload_failure_reason = nullif(btrim(coalesce(input_reason, '')), '')
  where id = input_submission_id;

  insert into public.essay_submission_events (
    submission_id,
    actor_id,
    event_type,
    from_status,
    to_status,
    metadata
  )
  values (
    input_submission_id,
    current_user_id,
    'status_changed',
    previous_status,
    'upload_failed',
    jsonb_build_object('reason', nullif(btrim(coalesce(input_reason, '')), ''))
  );
end;
$$;

drop function if exists public.admin_set_essay_in_review(uuid);
drop function if exists public.admin_claim_essay_submission(uuid);
create or replace function public.admin_claim_essay_submission(input_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_admin_id uuid := auth.uid();
begin
  if not public.is_admin(current_admin_id) then
    raise exception 'admin access required';
  end if;

  update public.essay_submissions
  set
    status = 'in_review',
    assigned_admin_id = current_admin_id,
    assigned_at = now()
  where id = input_submission_id
    and status = 'pending'
    and assigned_admin_id is null;

  if not found then
    raise exception 'essay submission is not available';
  end if;

  insert into public.essay_submission_events (
    submission_id,
    actor_id,
    event_type,
    from_status,
    to_status,
    metadata
  )
  values (
    input_submission_id,
    current_admin_id,
    'status_changed',
    'pending',
    'in_review',
    jsonb_build_object('assigned_admin_id', current_admin_id)
  );
end;
$$;

create or replace function public.admin_set_essay_in_review(input_submission_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  select public.admin_claim_essay_submission(input_submission_id);
$$;

drop function if exists public.admin_release_essay_submission(uuid);
create or replace function public.admin_release_essay_submission(input_submission_id uuid)
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

  if previous_status <> 'in_review' then
    raise exception 'only in-review submissions can return to queue';
  end if;

  update public.essay_submissions
  set
    status = 'pending',
    assigned_admin_id = null,
    assigned_at = null
  where id = input_submission_id;

  insert into public.essay_submission_events (
    submission_id,
    actor_id,
    event_type,
    from_status,
    to_status
  )
  values (input_submission_id, current_admin_id, 'status_changed', previous_status, 'pending');
end;
$$;

drop function if exists public.admin_transfer_essay_submission(uuid, uuid);
create or replace function public.admin_transfer_essay_submission(
  input_submission_id uuid,
  input_target_admin_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_admin_id uuid := auth.uid();
begin
  if not public.is_admin(current_admin_id) then
    raise exception 'admin access required';
  end if;

  if not public.is_admin(input_target_admin_id) then
    raise exception 'target admin access required';
  end if;

  update public.essay_submissions
  set
    status = 'in_review',
    assigned_admin_id = input_target_admin_id,
    assigned_at = now()
  where id = input_submission_id
    and status in ('pending', 'in_review');

  if not found then
    raise exception 'essay submission cannot be transferred';
  end if;

  insert into public.essay_submission_events (
    submission_id,
    actor_id,
    event_type,
    from_status,
    to_status,
    metadata
  )
  values (
    input_submission_id,
    current_admin_id,
    'status_changed',
    null,
    'in_review',
    jsonb_build_object('assigned_admin_id', input_target_admin_id)
  );
end;
$$;

drop function if exists public.admin_complete_essay_submission(uuid);
create or replace function public.admin_complete_essay_submission(input_submission_id uuid)
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

  if previous_status = 'cancelled' then
    raise exception 'cancelled submission cannot be completed';
  end if;

  update public.essay_submissions
  set
    status = 'completed',
    completed_at = now(),
    completed_by = current_admin_id,
    assigned_admin_id = coalesce(assigned_admin_id, current_admin_id),
    assigned_at = coalesce(assigned_at, now())
  where id = input_submission_id;

  insert into public.essay_submission_events (
    submission_id,
    actor_id,
    event_type,
    from_status,
    to_status
  )
  values (input_submission_id, current_admin_id, 'status_changed', previous_status, 'completed');
end;
$$;

drop function if exists public.admin_cancel_essay_submission(uuid, text);
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

  if submission.refund_ledger_id is null and submission.debit_ledger_id is not null then
    insert into public.credit_accounts (user_id, balance, monthly_allowance)
    values (submission.user_id, 50, 50)
    on conflict (user_id) do nothing;

    select *
    into account
    from public.credit_accounts
    where user_id = submission.user_id
    for update;

    update public.credit_accounts
    set balance = balance + 10
    where user_id = submission.user_id
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
      submission.user_id,
      10,
      account.balance,
      'essay_refund',
      'essay_submission',
      submission.id,
      submission.debit_ledger_id,
      jsonb_build_object(
        'cancelled_by', current_admin_id,
        'reason', nullif(btrim(coalesce(input_reason, '')), '')
      )
    )
    returning id into inserted_ledger_id;
  else
    inserted_ledger_id := submission.refund_ledger_id;
  end if;

  update public.essay_submissions
  set
    status = 'cancelled',
    cancellation_reason = nullif(btrim(coalesce(input_reason, '')), ''),
    refunded_by = case when submission.debit_ledger_id is not null then coalesce(refunded_by, current_admin_id) else refunded_by end,
    refunded_at = case when submission.debit_ledger_id is not null then coalesce(refunded_at, now()) else refunded_at end,
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

create unique index if not exists credit_ledger_one_essay_refund_unique
  on public.credit_ledger (reference_type, reference_id, reason)
  where reason = 'essay_refund' and reference_type = 'essay_submission';

drop function if exists public.admin_mark_abandoned_essay_uploads(interval);
create or replace function public.admin_mark_abandoned_essay_uploads(input_older_than interval default interval '24 hours')
returns table (submission_id uuid, storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_admin_id uuid := auth.uid();
begin
  if not public.is_admin(current_admin_id) then
    raise exception 'admin access required';
  end if;

  return query
  with abandoned as (
    update public.essay_submissions es
    set
      status = 'upload_failed',
      upload_failed_at = now(),
      upload_failure_reason = 'Limpeza administrativa de upload abandonado'
    where es.status = 'uploading'
      and es.created_at < now() - coalesce(input_older_than, interval '24 hours')
    returning es.id
  )
  select abandoned.id, esf.storage_path
  from abandoned
  left join public.essay_submission_files esf
    on esf.submission_id = abandoned.id;
end;
$$;

grant select, insert, delete on table public.essay_submission_files to authenticated;
grant select on table public.essay_correction_results to authenticated;
grant execute on function public.initiate_essay_submission(uuid, text, text, integer) to authenticated;
grant execute on function public.confirm_essay_submission(uuid, uuid, integer) to authenticated;
grant execute on function public.mark_essay_upload_failed(uuid, uuid, text) to authenticated;
grant execute on function public.admin_claim_essay_submission(uuid) to authenticated;
grant execute on function public.admin_set_essay_in_review(uuid) to authenticated;
grant execute on function public.admin_release_essay_submission(uuid) to authenticated;
grant execute on function public.admin_transfer_essay_submission(uuid, uuid) to authenticated;
grant execute on function public.admin_complete_essay_submission(uuid) to authenticated;
grant execute on function public.admin_cancel_essay_submission(uuid, text) to authenticated;
grant execute on function public.admin_mark_abandoned_essay_uploads(interval) to authenticated;

grant select, insert, update, delete on table public.essay_submission_files,
  public.essay_correction_results
  to service_role;
