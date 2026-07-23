create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'question_bank'
    check (source in ('question_bank', 'review', 'high_priority')),
  focus_mode text not null default 'recommended',
  session_size text not null default '15',
  filters jsonb not null default '{}'::jsonb,
  question_ids uuid[] not null default '{}'::uuid[],
  current_index integer not null default 0,
  answered_count integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  status text not null default 'Em andamento'
    check (status in ('Em andamento', 'Finalizado', 'Abandonado')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_question_answers
  add column if not exists practice_session_id uuid
    references public.practice_sessions(id) on delete set null;

create index if not exists idx_practice_sessions_user_status
  on public.practice_sessions(user_id, status, updated_at desc);

create unique index if not exists practice_sessions_one_active_per_source
  on public.practice_sessions(user_id, source)
  where status = 'Em andamento';

create index if not exists idx_user_question_answers_practice_session
  on public.user_question_answers(practice_session_id);

create unique index if not exists user_question_answers_one_per_practice_question
  on public.user_question_answers(practice_session_id, question_id)
  where practice_session_id is not null;

alter table public.practice_sessions enable row level security;

drop policy if exists "practice_sessions_own_select" on public.practice_sessions;
create policy "practice_sessions_own_select" on public.practice_sessions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "practice_sessions_own_insert" on public.practice_sessions;
create policy "practice_sessions_own_insert" on public.practice_sessions
for insert to authenticated
with check (user_id = auth.uid() and public.has_platform_access(auth.uid()));

drop policy if exists "practice_sessions_own_update" on public.practice_sessions;
create policy "practice_sessions_own_update" on public.practice_sessions
for update to authenticated
using (user_id = auth.uid() and public.has_platform_access(auth.uid()))
with check (user_id = auth.uid() and public.has_platform_access(auth.uid()));

drop policy if exists "user_question_answers_own_update" on public.user_question_answers;
create policy "user_question_answers_own_update" on public.user_question_answers
for update to authenticated
using (user_id = auth.uid() and public.has_platform_access(auth.uid()))
with check (user_id = auth.uid() and public.has_platform_access(auth.uid()));

grant select, insert, update, delete on table public.practice_sessions to authenticated;
