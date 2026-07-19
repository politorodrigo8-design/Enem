-- 007: idioma das questoes de lingua estrangeira (ENEM Dia 1, questoes 1-5)
-- 'en' = ingles, 'es' = espanhol, null = questao em portugues.

alter table public.questions
  add column if not exists language text
  check (language is null or language in ('en', 'es'));

comment on column public.questions.language is
  'Idioma da questao de lingua estrangeira (en/es); null para questoes em portugues.';

create index if not exists questions_language_idx
  on public.questions (language)
  where language is not null;
