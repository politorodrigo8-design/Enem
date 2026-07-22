create or replace function public.normalize_question_fingerprint_text(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.build_question_fingerprint(
  statement text,
  year integer,
  source text,
  question_number integer
)
returns text
language sql
immutable
set search_path = public
as $$
  select concat_ws(
    '|',
    public.normalize_question_fingerprint_text(statement),
    coalesce(year::text, ''),
    public.normalize_question_fingerprint_text(source),
    coalesce(question_number::text, '')
  );
$$;

alter table public.questions
  add column if not exists question_fingerprint text;

create or replace function public.set_question_fingerprint()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.question_fingerprint := public.build_question_fingerprint(
    new.statement,
    new.year,
    new.source,
    new.question_number
  );
  return new;
end;
$$;

drop trigger if exists questions_set_fingerprint on public.questions;
create trigger questions_set_fingerprint
before insert or update of statement, year, source, question_number
on public.questions
for each row
execute function public.set_question_fingerprint();

update public.questions
set question_fingerprint = public.build_question_fingerprint(
  statement,
  year,
  source,
  question_number
)
where question_fingerprint is null
   or question_fingerprint <> public.build_question_fingerprint(
    statement,
    year,
    source,
    question_number
   );

do $$
begin
  if exists (
    select 1
    from public.questions
    group by question_fingerprint
    having count(*) > 1
  ) then
    raise exception 'Cannot create questions_question_fingerprint_unique: duplicate question_fingerprint values exist.';
  end if;
end $$;

create unique index if not exists questions_question_fingerprint_unique
  on public.questions (question_fingerprint);

alter table public.questions
  alter column question_fingerprint set not null;
