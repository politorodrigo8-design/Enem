with topic_map(old_topic_name, canonical_topic_name, canonical_topic_slug) as (
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
    ('Trigonometria', 'Trigonometria', 'matematica-trigonometria')
),
canonical_subject as (
  select id, name, area, slug
  from public.subjects
  where slug = 'matematica'
),
pilot_subject as (
  select id, name, area, slug
  from public.subjects
  where slug = 'matematica-matematica'
),
pilot_questions as (
  select
    q.id,
    q.year,
    q.question_number,
    q.review_status,
    q.is_demo,
    q.correct_option,
    ps.area as old_area,
    ps.name as old_subject,
    pt.name as old_topic,
    cs.area as new_area,
    cs.name as new_subject,
    tm.canonical_topic_name as new_topic,
    coalesce(existing_topic.id::text, '(create)') as target_topic_id
  from public.questions q
  join pilot_subject ps on ps.id = q.subject_id
  join public.topics pt on pt.id = q.topic_id
  join topic_map tm on tm.old_topic_name = pt.name
  cross join canonical_subject cs
  left join public.topics existing_topic
    on existing_topic.subject_id = cs.id
   and public.normalize_question_fingerprint_text(existing_topic.name) =
       public.normalize_question_fingerprint_text(tm.canonical_topic_name)
  where q.is_demo = false
)
select *
from pilot_questions
order by year, question_number;
