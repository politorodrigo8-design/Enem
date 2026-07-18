-- Verificacao manual de isolamento para a fase beta.
-- Execute em ambiente de teste com dois usuarios reais substituindo os UUIDs.
-- Cada bloco roda em transacao e simula um JWT autenticado.

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
  set local request.jwt.claim.role = 'authenticated';

  -- Usuario A nao deve ver feedback do usuario B. Esperado: zero linhas.
  select id, user_id, route
  from public.beta_feedback
  where user_id = '00000000-0000-0000-0000-000000000002';

  -- Usuario A nao deve ver respostas privadas do usuario B. Esperado: zero linhas.
  select id, user_id, question_id
  from public.user_question_answers
  where user_id = '00000000-0000-0000-0000-000000000002';
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
  set local request.jwt.claim.role = 'authenticated';

  -- Esperado: erro "access fields can only be changed by an administrator".
  -- Rode isoladamente quando quiser validar o trigger.
  -- update public.profiles
  -- set access_level = 'paid'
  -- where id = '00000000-0000-0000-0000-000000000001';
rollback;

-- Esperado: erro de check constraint questions_high_priority_requires_editorial_review.
-- Rode isoladamente em ambiente descartavel.
-- update public.questions
-- set recurrence_category = 'Alta prioridade'
-- where id = (
--   select id from public.questions where reviewed = false limit 1
-- );
