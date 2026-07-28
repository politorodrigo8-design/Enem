create table if not exists public.user_question_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table public.user_question_favorites enable row level security;

drop policy if exists "user_question_favorites_own_select" on public.user_question_favorites;
create policy "user_question_favorites_own_select" on public.user_question_favorites
for select to authenticated using (user_id = auth.uid());

drop policy if exists "user_question_favorites_own_insert" on public.user_question_favorites;
create policy "user_question_favorites_own_insert" on public.user_question_favorites
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "user_question_favorites_own_delete" on public.user_question_favorites;
create policy "user_question_favorites_own_delete" on public.user_question_favorites
for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on table public.user_question_favorites to authenticated;

