alter table public.questions
  add column if not exists media_required boolean not null default false;

create table if not exists public.question_media (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  media_type text not null default 'image',
  url text not null,
  alt_text text,
  caption text,
  source_pdf text,
  source_page integer,
  width integer,
  height integer,
  sort_order integer not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint question_media_type_check
    check (media_type in ('image', 'formula', 'table', 'text_base', 'pdf_page')),
  constraint question_media_url_check
    check (
      length(trim(url)) > 0
      and (
        url like '/%'
        or url ~* '^https?://'
      )
    ),
  constraint question_media_source_page_check
    check (source_page is null or source_page > 0),
  constraint question_media_dimensions_check
    check (
      (width is null or width > 0)
      and (height is null or height > 0)
    )
);

create index if not exists question_media_question_order_idx
  on public.question_media (question_id, sort_order, created_at);

create unique index if not exists question_media_question_url_unique
  on public.question_media (question_id, url);

alter table public.question_media enable row level security;

drop policy if exists "question_media_read_authenticated" on public.question_media;
create policy "question_media_read_authenticated" on public.question_media
for select to authenticated
using (
  public.has_platform_access(auth.uid())
  and exists (
    select 1
    from public.questions q
    where q.id = question_id
  )
);

grant select on table public.question_media to authenticated;
