-- Torna mutations de prática/simulado idempotentes entre abas e dispositivos.

with ranked_answers as (
  select
    id,
    row_number() over (
      partition by practice_session_id, question_id
      order by answered_at desc, id desc
    ) as position
  from public.user_question_answers
  where practice_session_id is not null
)
update public.user_question_answers answer
set practice_session_id = null
from ranked_answers ranked
where answer.id = ranked.id
  and ranked.position > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_question_answers_practice_session_question_key'
      and conrelid = 'public.user_question_answers'::regclass
  ) then
    alter table public.user_question_answers
      add constraint user_question_answers_practice_session_question_key
      unique (practice_session_id, question_id);
  end if;
end $$;

with ranked_attempts as (
  select
    id,
    row_number() over (
      partition by user_id, simulation_id
      order by started_at desc, id desc
    ) as position
  from public.user_simulations
  where status = 'Em andamento'
)
update public.user_simulations attempt
set status = 'Abandonado'
from ranked_attempts ranked
where attempt.id = ranked.id
  and ranked.position > 1;

create unique index if not exists user_simulations_one_active_per_simulation
  on public.user_simulations(user_id, simulation_id)
  where status = 'Em andamento';
