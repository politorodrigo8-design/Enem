-- Fase beta NexoENEM.
-- Esta migration adiciona controle de acesso, onboarding, candidaturas beta,
-- feedback, eventos de produto e campos editoriais para expansao segura do banco.

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists access_level text not null default 'free',
  add column if not exists access_expires_at timestamptz,
  add column if not exists beta_tester boolean not null default false,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists study_preferences jsonb not null default '{}'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_access_level_check;

alter table public.profiles
  add constraint profiles_access_level_check
  check (access_level in ('free', 'full'));

create or replace function public.prevent_student_access_field_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and auth.uid() = old.id then
    if new.access_level is distinct from old.access_level
      or new.access_expires_at is distinct from old.access_expires_at
      or new.beta_tester is distinct from old.beta_tester then
      raise exception 'access fields can only be changed by an administrator';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_student_access_field_update on public.profiles;
create trigger profiles_prevent_student_access_field_update
before update on public.profiles
for each row execute function public.prevent_student_access_field_update();

create or replace function public.has_full_access(user_id uuid default auth.uid())
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
      and p.access_level = 'full'
      and (p.access_expires_at is null or p.access_expires_at > now())
  );
$$;

create or replace function public.is_free_question(target_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from (
      select q.id
      from public.questions q
      where q.is_demo = true
      order by q.created_at, q.id
      limit 20
    ) free_questions
    where free_questions.id = target_question_id
  );
$$;

create table if not exists public.beta_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  city text not null,
  school_year text not null,
  previous_score integer,
  target_course text not null,
  main_difficulty text not null,
  whatsapp text,
  contact_authorized boolean not null default false,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_applications_previous_score_check
    check (previous_score is null or (previous_score >= 0 and previous_score <= 1000)),
  constraint beta_applications_email_not_blank check (length(btrim(email)) >= 5)
);

create unique index if not exists beta_applications_email_unique
  on public.beta_applications (lower(email));

create unique index if not exists beta_applications_user_unique
  on public.beta_applications (user_id)
  where user_id is not null;

drop trigger if exists beta_applications_set_updated_at on public.beta_applications;
create trigger beta_applications_set_updated_at
before update on public.beta_applications
for each row execute function public.set_updated_at();

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('erro', 'sugestao', 'duvida', 'elogio')),
  route text not null,
  message text not null,
  message_hash text generated always as (md5(lower(btrim(message)))) stored,
  rating integer not null check (rating between 1 and 5),
  easy_to_understand boolean,
  client_created_at timestamptz,
  created_at timestamptz not null default now(),
  constraint beta_feedback_message_length_check
    check (length(btrim(message)) between 8 and 1200)
);

create unique index if not exists beta_feedback_duplicate_guard
  on public.beta_feedback (user_id, route, feedback_type, message_hash);

create index if not exists beta_feedback_user_created_at_idx
  on public.beta_feedback (user_id, created_at desc);

create or replace function public.can_submit_beta_feedback(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    and (
      select count(*)
      from public.beta_feedback bf
      where bf.user_id = target_user_id
        and bf.created_at > now() - interval '10 minutes'
    ) < 5;
$$;

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (
    event_name in (
      'signup_completed',
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
      'feedback_submitted'
    )
  ),
  route text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint product_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists product_events_user_created_at_idx
  on public.product_events (user_id, created_at desc);

create index if not exists product_events_name_created_at_idx
  on public.product_events (event_name, created_at desc);

create table if not exists public.radar_methodology_versions (
  id uuid primary key default gen_random_uuid(),
  methodology_version text not null,
  source text not null,
  analyzed_period text,
  exam_count integer not null default 0,
  question_count integer not null default 0,
  last_updated_at timestamptz not null default now(),
  reviewed_by text,
  notes text,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.radar_methodology_versions (
  methodology_version,
  source,
  analyzed_period,
  exam_count,
  question_count,
  reviewed_by,
  notes,
  is_demo
)
select
  'beta-demo-v1',
  'Seed demonstrativo NexoENEM',
  'Periodo demonstrativo sem analise oficial consolidada',
  0,
  0,
  'Equipe NexoENEM',
  'Registro inicial para transparência. Dados de recorrencia do seed sao demonstrativos e nao representam previsao exata.',
  true
where not exists (
  select 1
  from public.radar_methodology_versions
  where methodology_version = 'beta-demo-v1'
);

alter table public.questions
  add column if not exists source_url text,
  add column if not exists exam_name text not null default 'Questao demonstrativa',
  add column if not exists exam_color text,
  add column if not exists question_number integer,
  add column if not exists is_official boolean not null default false,
  add column if not exists is_authorial boolean not null default true,
  add column if not exists is_inspired boolean not null default false,
  add column if not exists exam_edition text,
  add column if not exists exam_day text,
  add column if not exists discipline text,
  add column if not exists subtopic text,
  add column if not exists competence text,
  add column if not exists skill text,
  add column if not exists content_recurrence text,
  add column if not exists charge_pattern text,
  add column if not exists estimated_priority text not null default 'Complementar',
  add column if not exists priority_score numeric(7,2) not null default 0,
  add column if not exists confidence_level text,
  add column if not exists priority_reason text,
  add column if not exists official_source text,
  add column if not exists official_exam_url text,
  add column if not exists official_answer_key_url text,
  add column if not exists priority_is_educational_estimate boolean not null default true,
  add column if not exists last_editorial_review_at timestamptz,
  add column if not exists editorial_reviewer text,
  add column if not exists reviewed boolean not null default false,
  add column if not exists review_status text not null default 'pending',
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists editorial_notes text,
  add column if not exists source_verified boolean not null default false,
  add column if not exists answer_verified boolean not null default false,
  add column if not exists media_verified boolean not null default false,
  add column if not exists classification_version text not null default 'beta-2026-07',
  add column if not exists recurrence_category text not null default 'Complementar';

alter table public.questions
  drop constraint if exists questions_review_status_check,
  drop constraint if exists questions_confidence_level_check,
  drop constraint if exists questions_estimated_priority_check,
  drop constraint if exists questions_recurrence_category_check,
  drop constraint if exists questions_high_priority_requires_editorial_review;

alter table public.questions
  add constraint questions_review_status_check
  check (review_status in ('pending', 'approved', 'rejected', 'needs_review')),
  add constraint questions_confidence_level_check
  check (confidence_level is null or confidence_level in ('baixa', 'media', 'alta')),
  add constraint questions_estimated_priority_check
  check (estimated_priority in (
    'Potencial muito alto de recorrencia do conteudo',
    'Alta prioridade',
    'Prioridade media',
    'Complementar'
  )),
  add constraint questions_recurrence_category_check
  check (recurrence_category in (
    'Potencial muito alto de recorrencia do conteudo',
    'Alta prioridade',
    'Prioridade media',
    'Complementar'
  )),
  add constraint questions_high_priority_requires_editorial_review
  check (
    recurrence_category not in (
      'Potencial muito alto de recorrencia do conteudo',
      'Alta prioridade'
    )
    or (
      reviewed = true
      and review_status = 'approved'
      and source_verified = true
      and answer_verified = true
      and confidence_level is not null
      and priority_reason is not null
      and length(btrim(priority_reason)) >= 12
    )
  );

create index if not exists questions_editorial_review_idx
  on public.questions (review_status, reviewed, source_verified, answer_verified);

create index if not exists questions_recurrence_filters_idx
  on public.questions (
    is_official,
    recurrence_category,
    confidence_level,
    year,
    difficulty
  );

alter table public.beta_applications enable row level security;
alter table public.beta_feedback enable row level security;
alter table public.product_events enable row level security;
alter table public.radar_methodology_versions enable row level security;

drop policy if exists "beta_applications_insert_public" on public.beta_applications;
create policy "beta_applications_insert_public" on public.beta_applications
for insert to anon, authenticated
with check (user_id is null or user_id = auth.uid());

drop policy if exists "beta_applications_select_own" on public.beta_applications;
create policy "beta_applications_select_own" on public.beta_applications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "beta_feedback_insert_own" on public.beta_feedback;
create policy "beta_feedback_insert_own" on public.beta_feedback
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.can_submit_beta_feedback(user_id)
);

drop policy if exists "beta_feedback_select_own" on public.beta_feedback;
create policy "beta_feedback_select_own" on public.beta_feedback
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "product_events_insert_own" on public.product_events;
create policy "product_events_insert_own" on public.product_events
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "product_events_select_own" on public.product_events;
create policy "product_events_select_own" on public.product_events
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "radar_methodology_read_authenticated" on public.radar_methodology_versions;
create policy "radar_methodology_read_authenticated" on public.radar_methodology_versions
for select to authenticated
using (true);

drop policy if exists "questions_read_authenticated" on public.questions;
create policy "questions_read_authenticated" on public.questions
for select to authenticated
using (
  is_demo = true
  or public.has_full_access(auth.uid())
  or public.is_free_question(id)
);

drop policy if exists "question_options_read_authenticated" on public.question_options;
create policy "question_options_read_authenticated" on public.question_options
for select to authenticated
using (
  exists (
    select 1
    from public.questions q
    where q.id = question_id
  )
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (
  id = auth.uid()
  and access_level = 'free'
  and access_expires_at is null
  and beta_tester = false
);

drop policy if exists "user_question_answers_own_insert" on public.user_question_answers;
create policy "user_question_answers_own_insert" on public.user_question_answers
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    public.has_full_access(auth.uid())
    or (
      select count(*)
      from public.user_question_answers uqa
      where uqa.user_id = auth.uid()
    ) < 20
  )
);

drop policy if exists "user_question_reviews_own_all" on public.user_question_reviews;
drop policy if exists "user_question_reviews_own_select_full" on public.user_question_reviews;
create policy "user_question_reviews_own_select_full" on public.user_question_reviews
for select to authenticated
using (user_id = auth.uid() and public.has_full_access(auth.uid()));

drop policy if exists "user_question_reviews_own_insert_full" on public.user_question_reviews;
create policy "user_question_reviews_own_insert_full" on public.user_question_reviews
for insert to authenticated
with check (user_id = auth.uid() and public.has_full_access(auth.uid()));

drop policy if exists "user_question_reviews_own_update_full" on public.user_question_reviews;
create policy "user_question_reviews_own_update_full" on public.user_question_reviews
for update to authenticated
using (user_id = auth.uid() and public.has_full_access(auth.uid()))
with check (user_id = auth.uid() and public.has_full_access(auth.uid()));

drop policy if exists "user_question_reviews_own_delete_full" on public.user_question_reviews;
create policy "user_question_reviews_own_delete_full" on public.user_question_reviews
for delete to authenticated
using (user_id = auth.uid() and public.has_full_access(auth.uid()));

drop policy if exists "user_simulations_own_all" on public.user_simulations;
drop policy if exists "user_simulations_own_select" on public.user_simulations;
create policy "user_simulations_own_select" on public.user_simulations
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "user_simulations_own_insert_beta_access" on public.user_simulations;
create policy "user_simulations_own_insert_beta_access" on public.user_simulations
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    public.has_full_access(auth.uid())
    or exists (
      select 1
      from public.simulations s
      where s.id = simulation_id
        and lower(s.title) like '%diagn%'
    )
  )
);

drop policy if exists "user_simulations_own_update" on public.user_simulations;
create policy "user_simulations_own_update" on public.user_simulations
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_simulations_own_delete" on public.user_simulations;
create policy "user_simulations_own_delete" on public.user_simulations
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "study_plans_own_all" on public.study_plans;
drop policy if exists "study_plans_own_select" on public.study_plans;
create policy "study_plans_own_select" on public.study_plans
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "study_plans_own_insert_full" on public.study_plans;
create policy "study_plans_own_insert_full" on public.study_plans
for insert to authenticated
with check (user_id = auth.uid() and public.has_full_access(auth.uid()));

drop policy if exists "study_plans_own_update_full" on public.study_plans;
create policy "study_plans_own_update_full" on public.study_plans
for update to authenticated
using (user_id = auth.uid() and public.has_full_access(auth.uid()))
with check (user_id = auth.uid() and public.has_full_access(auth.uid()));

drop policy if exists "study_plans_own_delete_full" on public.study_plans;
create policy "study_plans_own_delete_full" on public.study_plans
for delete to authenticated
using (user_id = auth.uid() and public.has_full_access(auth.uid()));

drop policy if exists "study_plan_items_own_select" on public.study_plan_items;
create policy "study_plan_items_own_select" on public.study_plan_items
for select to authenticated
using (
  exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "study_plan_items_own_insert" on public.study_plan_items;
drop policy if exists "study_plan_items_own_insert_full" on public.study_plan_items;
create policy "study_plan_items_own_insert_full" on public.study_plan_items
for insert to authenticated
with check (
  public.has_full_access(auth.uid())
  and exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "study_plan_items_own_update" on public.study_plan_items;
drop policy if exists "study_plan_items_own_update_full" on public.study_plan_items;
create policy "study_plan_items_own_update_full" on public.study_plan_items
for update to authenticated
using (
  public.has_full_access(auth.uid())
  and exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_id and sp.user_id = auth.uid()
  )
)
with check (
  public.has_full_access(auth.uid())
  and exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "study_plan_items_own_delete_full" on public.study_plan_items;
create policy "study_plan_items_own_delete_full" on public.study_plan_items
for delete to authenticated
using (
  public.has_full_access(auth.uid())
  and exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_id and sp.user_id = auth.uid()
  )
);

grant usage on schema public to anon, authenticated;

grant select on table public.radar_methodology_versions to authenticated;
grant insert, select on table public.beta_applications to anon, authenticated;
grant insert, select on table public.beta_feedback, public.product_events to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
