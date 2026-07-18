create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  target_course text,
  target_university text,
  target_score integer,
  previous_score integer,
  weekly_hours integer,
  available_days text,
  perceived_difficulties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  slug text not null unique
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  slug text not null unique,
  historical_recurrence numeric(5,2) not null default 0,
  priority_weight numeric(5,2) not null default 0,
  difficulty_level text not null check (difficulty_level in ('Baixa', 'Média', 'Alta')),
  strategic_importance numeric(5,2) not null default 0
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  statement text not null,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  topic_id uuid not null references public.topics(id) on delete restrict,
  difficulty text not null check (difficulty in ('Baixa', 'Média', 'Alta')),
  year integer not null,
  source text not null,
  is_demo boolean not null default true,
  explanation text not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D', 'E')),
  created_at timestamptz not null default now()
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_key text not null check (option_key in ('A', 'B', 'C', 'D', 'E')),
  option_text text not null,
  unique (question_id, option_key)
);

create table if not exists public.user_question_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option text not null check (selected_option in ('A', 'B', 'C', 'D', 'E')),
  is_correct boolean not null,
  response_time_seconds integer not null default 0,
  answered_at timestamptz not null default now()
);

create table if not exists public.user_question_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  mastered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  duration_minutes integer not null,
  difficulty text not null check (difficulty in ('Baixa', 'Média', 'Alta')),
  status text not null default 'Disponível'
);

create table if not exists public.simulation_questions (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.simulations(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  position integer not null,
  unique (simulation_id, question_id),
  unique (simulation_id, position)
);

create table if not exists public.user_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  simulation_id uuid not null references public.simulations(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total_questions integer not null default 0,
  correct_answers integer not null default 0,
  score_percentage numeric(5,2) not null default 0,
  status text not null default 'Em andamento'
);

create table if not exists public.user_simulation_answers (
  id uuid primary key default gen_random_uuid(),
  user_simulation_id uuid not null references public.user_simulations(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option text not null check (selected_option in ('A', 'B', 'C', 'D', 'E')),
  is_correct boolean not null,
  response_time_seconds integer not null default 0,
  unique (user_simulation_id, question_id)
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  status text not null default 'Ativo',
  created_at timestamptz not null default now()
);

create table if not exists public.study_plan_items (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid not null references public.study_plans(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  scheduled_date date not null,
  duration_minutes integer not null,
  question_goal integer not null,
  completed boolean not null default false,
  completed_at timestamptz
);

create table if not exists public.user_topic_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  total_answers integer not null default 0,
  correct_answers integer not null default 0,
  accuracy_percentage numeric(5,2) not null default 0,
  priority_score numeric(7,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, topic_id)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_question_reviews_set_updated_at on public.user_question_reviews;
create trigger user_question_reviews_set_updated_at
before update on public.user_question_reviews
for each row execute function public.set_updated_at();

drop trigger if exists user_topic_performance_set_updated_at on public.user_topic_performance;
create trigger user_topic_performance_set_updated_at
before update on public.user_topic_performance
for each row execute function public.set_updated_at();

create index if not exists idx_questions_subject_id on public.questions(subject_id);
create index if not exists idx_questions_topic_id on public.questions(topic_id);
create index if not exists idx_user_question_answers_user_id on public.user_question_answers(user_id);
create index if not exists idx_user_question_answers_question_id on public.user_question_answers(question_id);
create index if not exists idx_user_simulations_user_id on public.user_simulations(user_id);
create index if not exists idx_user_simulation_answers_attempt_id on public.user_simulation_answers(user_simulation_id);
create index if not exists idx_study_plans_user_week on public.study_plans(user_id, week_start);
create index if not exists idx_user_topic_performance_user_id on public.user_topic_performance(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.user_question_answers enable row level security;
alter table public.user_question_reviews enable row level security;
alter table public.simulations enable row level security;
alter table public.simulation_questions enable row level security;
alter table public.user_simulations enable row level security;
alter table public.user_simulation_answers enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_plan_items enable row level security;
alter table public.user_topic_performance enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "subjects_read_authenticated" on public.subjects;
create policy "subjects_read_authenticated" on public.subjects
for select to authenticated using (true);

drop policy if exists "topics_read_authenticated" on public.topics;
create policy "topics_read_authenticated" on public.topics
for select to authenticated using (true);

drop policy if exists "questions_read_authenticated" on public.questions;
create policy "questions_read_authenticated" on public.questions
for select to authenticated using (true);

drop policy if exists "question_options_read_authenticated" on public.question_options;
create policy "question_options_read_authenticated" on public.question_options
for select to authenticated using (true);

drop policy if exists "simulations_read_authenticated" on public.simulations;
create policy "simulations_read_authenticated" on public.simulations
for select to authenticated using (true);

drop policy if exists "simulation_questions_read_authenticated" on public.simulation_questions;
create policy "simulation_questions_read_authenticated" on public.simulation_questions
for select to authenticated using (true);

drop policy if exists "user_question_answers_own_select" on public.user_question_answers;
create policy "user_question_answers_own_select" on public.user_question_answers
for select to authenticated using (user_id = auth.uid());

drop policy if exists "user_question_answers_own_insert" on public.user_question_answers;
create policy "user_question_answers_own_insert" on public.user_question_answers
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "user_question_reviews_own_all" on public.user_question_reviews;
create policy "user_question_reviews_own_all" on public.user_question_reviews
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_simulations_own_all" on public.user_simulations;
create policy "user_simulations_own_all" on public.user_simulations
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_simulation_answers_own_select" on public.user_simulation_answers;
create policy "user_simulation_answers_own_select" on public.user_simulation_answers
for select to authenticated using (
  exists (
    select 1 from public.user_simulations us
    where us.id = user_simulation_id and us.user_id = auth.uid()
  )
);

drop policy if exists "user_simulation_answers_own_insert" on public.user_simulation_answers;
create policy "user_simulation_answers_own_insert" on public.user_simulation_answers
for insert to authenticated with check (
  exists (
    select 1 from public.user_simulations us
    where us.id = user_simulation_id and us.user_id = auth.uid()
  )
);

drop policy if exists "user_simulation_answers_own_update" on public.user_simulation_answers;
create policy "user_simulation_answers_own_update" on public.user_simulation_answers
for update to authenticated using (
  exists (
    select 1 from public.user_simulations us
    where us.id = user_simulation_id and us.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.user_simulations us
    where us.id = user_simulation_id and us.user_id = auth.uid()
  )
);

drop policy if exists "study_plans_own_all" on public.study_plans;
create policy "study_plans_own_all" on public.study_plans
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "study_plan_items_own_select" on public.study_plan_items;
create policy "study_plan_items_own_select" on public.study_plan_items
for select to authenticated using (
  exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "study_plan_items_own_insert" on public.study_plan_items;
create policy "study_plan_items_own_insert" on public.study_plan_items
for insert to authenticated with check (
  exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "study_plan_items_own_update" on public.study_plan_items;
create policy "study_plan_items_own_update" on public.study_plan_items
for update to authenticated using (
  exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_id and sp.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "user_topic_performance_own_all" on public.user_topic_performance;
create policy "user_topic_performance_own_all" on public.user_topic_performance
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
