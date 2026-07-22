begin;

create temp table pilot_taxonomy_fix_topic_map (
  old_topic_name text primary key,
  canonical_topic_name text not null,
  canonical_topic_slug text not null
) on commit drop;

insert into pilot_taxonomy_fix_topic_map (old_topic_name, canonical_topic_name, canonical_topic_slug)
values
  ('Analise combinatoria', 'Análise combinatória', 'matematica-analise-combinatoria'),
  ('Equacoes e inequacoes', 'Equações e inequações', 'matematica-equacoes-e-inequacoes'),
  ('Escalas e unidades de medida', 'Escalas e unidades de medida', 'matematica-escalas-e-unidades-de-medida'),
  ('Estatistica', 'Estatística', 'estatistica'),
  ('Funcoes', 'Funções', 'funcoes'),
  ('Geometria espacial', 'Geometria espacial', 'matematica-geometria-espacial'),
  ('Geometria plana', 'Geometria plana', 'matematica-geometria-plana'),
  ('Interpretacao de graficos e tabelas', 'Interpretação de gráficos e tabelas', 'matematica-interpretacao-de-graficos-e-tabelas'),
  ('Matematica financeira', 'Matemática financeira', 'matematica-financeira'),
  ('Numeros e operacoes', 'Números e operações', 'matematica-numeros-e-operacoes'),
  ('Probabilidade', 'Probabilidade', 'matematica-probabilidade'),
  ('Razao, proporcao e porcentagem', 'Razão, proporção e porcentagem', 'matematica-razao-proporcao-e-porcentagem'),
  ('Sequencias e progressoes', 'Sequências e progressões', 'matematica-sequencias-e-progressoes'),
  ('Trigonometria', 'Trigonometria', 'matematica-trigonometria');

do $$
declare
  pilot_count integer;
  mapped_count integer;
  updated_count integer;
  invalid_state_count integer;
begin
  if not exists (select 1 from public.subjects where slug = 'matematica') then
    raise exception 'Canonical subject slug=matematica not found.';
  end if;

  if not exists (select 1 from public.subjects where slug = 'matematica-matematica') then
    raise exception 'Pilot subject slug=matematica-matematica not found.';
  end if;

  select count(*)
  into pilot_count
  from public.questions q
  join public.subjects s on s.id = q.subject_id
  where s.slug = 'matematica-matematica'
    and q.is_demo = false;

  if pilot_count <> 40 then
    raise exception 'Expected 40 pilot private questions under matematica-matematica, found %.', pilot_count;
  end if;

  select count(*)
  into mapped_count
  from public.questions q
  join public.subjects s on s.id = q.subject_id
  join public.topics t on t.id = q.topic_id
  join pilot_taxonomy_fix_topic_map m on m.old_topic_name = t.name
  where s.slug = 'matematica-matematica'
    and q.is_demo = false;

  if mapped_count <> 40 then
    raise exception 'Expected 40 mapped pilot questions, found %.', mapped_count;
  end if;

  select count(*)
  into invalid_state_count
  from public.questions q
  join public.subjects s on s.id = q.subject_id
  where s.slug = 'matematica-matematica'
    and q.is_demo = false
    and (
      q.review_status <> 'pending'
      or q.reviewed is distinct from false
    );

  if invalid_state_count <> 0 then
    raise exception 'Pilot taxonomy fix found % non-pending or reviewed rows; aborting.', invalid_state_count;
  end if;

  insert into public.topics (
    subject_id,
    name,
    slug,
    historical_recurrence,
    priority_weight,
    difficulty_level,
    strategic_importance
  )
  select
    cs.id,
    m.canonical_topic_name,
    m.canonical_topic_slug,
    0,
    0,
    'Média',
    0
  from pilot_taxonomy_fix_topic_map m
  cross join public.subjects cs
  where cs.slug = 'matematica'
    and not exists (
      select 1
      from public.topics t
      where t.subject_id = cs.id
        and public.normalize_question_fingerprint_text(t.name) =
            public.normalize_question_fingerprint_text(m.canonical_topic_name)
    )
  on conflict (slug) do nothing;

  update public.questions q
  set
    subject_id = cs.id,
    topic_id = target_topic.id,
    discipline = 'Matemática'
  from public.subjects pilot_subject
  join public.topics old_topic on old_topic.subject_id = pilot_subject.id
  join pilot_taxonomy_fix_topic_map m on m.old_topic_name = old_topic.name
  cross join public.subjects cs
  join public.topics target_topic
    on target_topic.subject_id = cs.id
   and public.normalize_question_fingerprint_text(target_topic.name) =
       public.normalize_question_fingerprint_text(m.canonical_topic_name)
  where pilot_subject.slug = 'matematica-matematica'
    and cs.slug = 'matematica'
    and q.subject_id = pilot_subject.id
    and q.topic_id = old_topic.id
    and q.is_demo = false;

  get diagnostics updated_count = row_count;

  if updated_count <> 40 then
    raise exception 'Expected to update 40 pilot questions, updated %.', updated_count;
  end if;
end $$;

update public.topics t
set name = m.canonical_topic_name
from public.subjects s
join pilot_taxonomy_fix_topic_map m on true
where s.slug = 'matematica-matematica'
  and t.subject_id = s.id
  and t.name = m.old_topic_name;

update public.subjects
set
  name = 'Matemática',
  area = 'Matemática'
where slug = 'matematica-matematica';

select
  count(*) as total_questions,
  count(*) filter (where review_status = 'pending') as pending_questions,
  count(*) filter (where is_demo = false) as private_questions,
  count(*) filter (where is_demo = true) as demo_questions
from public.questions;

commit;
