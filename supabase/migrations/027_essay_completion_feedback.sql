-- 027: publish manual essay corrections with ENEM scores and written feedback.

drop function if exists public.admin_complete_essay_submission(uuid);
drop function if exists public.admin_complete_essay_submission(
  uuid,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text
);

create or replace function public.admin_complete_essay_submission(
  input_submission_id uuid,
  input_competence_1_score integer,
  input_competence_2_score integer,
  input_competence_3_score integer,
  input_competence_4_score integer,
  input_competence_5_score integer,
  input_general_feedback text,
  input_competence_1_feedback text default null,
  input_competence_2_feedback text default null,
  input_competence_3_feedback text default null,
  input_competence_4_feedback text default null,
  input_competence_5_feedback text default null,
  input_reviewer_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_admin_id uuid := auth.uid();
  previous_status text;
  responsible_admin_id uuid;
  clean_general_feedback text := nullif(btrim(coalesce(input_general_feedback, '')), '');
  clean_competence_1_feedback text := nullif(btrim(coalesce(input_competence_1_feedback, '')), '');
  clean_competence_2_feedback text := nullif(btrim(coalesce(input_competence_2_feedback, '')), '');
  clean_competence_3_feedback text := nullif(btrim(coalesce(input_competence_3_feedback, '')), '');
  clean_competence_4_feedback text := nullif(btrim(coalesce(input_competence_4_feedback, '')), '');
  clean_competence_5_feedback text := nullif(btrim(coalesce(input_competence_5_feedback, '')), '');
  clean_reviewer_notes text := nullif(btrim(coalesce(input_reviewer_notes, '')), '');
  total_score integer :=
    input_competence_1_score +
    input_competence_2_score +
    input_competence_3_score +
    input_competence_4_score +
    input_competence_5_score;
begin
  if not public.is_admin(current_admin_id) then
    raise exception 'admin access required';
  end if;

  if clean_general_feedback is null or length(clean_general_feedback) < 10 then
    raise exception 'correction feedback required';
  end if;

  if length(clean_general_feedback) > 8000
    or length(coalesce(clean_competence_1_feedback, '')) > 1500
    or length(coalesce(clean_competence_2_feedback, '')) > 1500
    or length(coalesce(clean_competence_3_feedback, '')) > 1500
    or length(coalesce(clean_competence_4_feedback, '')) > 1500
    or length(coalesce(clean_competence_5_feedback, '')) > 1500
    or length(coalesce(clean_reviewer_notes, '')) > 1500
  then
    raise exception 'correction feedback too long';
  end if;

  if input_competence_1_score not between 0 and 200
    or input_competence_2_score not between 0 and 200
    or input_competence_3_score not between 0 and 200
    or input_competence_4_score not between 0 and 200
    or input_competence_5_score not between 0 and 200
  then
    raise exception 'invalid essay score';
  end if;

  select status, assigned_admin_id
  into previous_status, responsible_admin_id
  from public.essay_submissions
  where id = input_submission_id
  for update;

  if previous_status is null then
    raise exception 'essay submission not found';
  end if;

  if previous_status = 'cancelled' then
    raise exception 'cancelled submission cannot be completed';
  end if;

  if previous_status = 'completed' then
    raise exception 'completed submission cannot be completed';
  end if;

  if previous_status not in ('pending', 'in_review') then
    raise exception 'essay submission cannot be completed';
  end if;

  if responsible_admin_id is not null and responsible_admin_id <> current_admin_id then
    raise exception 'essay submission assigned to another admin';
  end if;

  update public.essay_submissions
  set
    status = 'completed',
    completed_at = now(),
    completed_by = current_admin_id,
    assigned_admin_id = coalesce(assigned_admin_id, current_admin_id),
    assigned_at = coalesce(assigned_at, now()),
    scores = jsonb_build_object(
      'competence_1', input_competence_1_score,
      'competence_2', input_competence_2_score,
      'competence_3', input_competence_3_score,
      'competence_4', input_competence_4_score,
      'competence_5', input_competence_5_score,
      'total', total_score
    ),
    feedback = jsonb_build_object(
      'competence_1', clean_competence_1_feedback,
      'competence_2', clean_competence_2_feedback,
      'competence_3', clean_competence_3_feedback,
      'competence_4', clean_competence_4_feedback,
      'competence_5', clean_competence_5_feedback
    ),
    reviewer_notes = clean_reviewer_notes
  where id = input_submission_id;

  insert into public.essay_correction_results (
    submission_id,
    general_text,
    created_by,
    completed_at,
    published_at
  )
  values (
    input_submission_id,
    clean_general_feedback,
    current_admin_id,
    now(),
    now()
  )
  on conflict (submission_id) do update
  set
    general_text = excluded.general_text,
    created_by = excluded.created_by,
    completed_at = excluded.completed_at,
    published_at = excluded.published_at;

  insert into public.essay_submission_events (
    submission_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    input_submission_id,
    current_admin_id,
    'correction_saved',
    jsonb_build_object('total_score', total_score)
  );

  insert into public.essay_submission_events (
    submission_id,
    actor_id,
    event_type,
    from_status,
    to_status,
    metadata
  )
  values (
    input_submission_id,
    current_admin_id,
    'status_changed',
    previous_status,
    'completed',
    jsonb_build_object('completed_by', current_admin_id)
  );
end;
$$;

grant execute on function public.admin_complete_essay_submission(
  uuid,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
