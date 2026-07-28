-- 033: product feedback inbox for administrators.

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  feedback_type text not null check (feedback_type in ('elogio', 'sugestao', 'duvida', 'problema')),
  message text not null,
  rating integer check (rating between 1 and 5),
  route text not null,
  context jsonb not null default '{}'::jsonb,
  user_agent_summary text,
  source text not null default 'dashboard',
  related_id text,
  status text not null default 'novo' check (status in ('novo', 'em_analise', 'resolvido', 'ignorado')),
  internal_note text,
  read_at timestamptz,
  assigned_admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedbacks_message_length_check check (length(btrim(message)) between 8 and 1200),
  constraint feedbacks_route_length_check check (length(route) between 1 and 200),
  constraint feedbacks_user_agent_length_check check (user_agent_summary is null or length(user_agent_summary) <= 240),
  constraint feedbacks_internal_note_length_check check (internal_note is null or length(internal_note) <= 2000)
);

create index if not exists feedbacks_status_created_at_idx
  on public.feedbacks (status, created_at desc);

create index if not exists feedbacks_type_created_at_idx
  on public.feedbacks (feedback_type, created_at desc);

create index if not exists feedbacks_rating_created_at_idx
  on public.feedbacks (rating, created_at desc)
  where rating is not null;

create index if not exists feedbacks_route_created_at_idx
  on public.feedbacks (route, created_at desc);

create unique index if not exists feedbacks_duplicate_guard
  on public.feedbacks (user_id, route, feedback_type, md5(lower(btrim(message))));

drop trigger if exists feedbacks_set_updated_at on public.feedbacks;
create trigger feedbacks_set_updated_at
before update on public.feedbacks
for each row execute function public.set_updated_at();

alter table public.feedbacks enable row level security;

drop policy if exists "feedbacks_insert_own" on public.feedbacks;
create policy "feedbacks_insert_own" on public.feedbacks
for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'novo'
  and internal_note is null
  and read_at is null
  and assigned_admin_id is null
);

drop policy if exists "feedbacks_admin_select" on public.feedbacks;
create policy "feedbacks_admin_select" on public.feedbacks
for select to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "feedbacks_admin_update" on public.feedbacks;
create policy "feedbacks_admin_update" on public.feedbacks
for update to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

grant insert on table public.feedbacks to authenticated;
grant select, update on table public.feedbacks to authenticated;
