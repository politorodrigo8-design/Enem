grant usage on schema public to authenticated;

grant select on table
  public.profiles,
  public.subjects,
  public.topics,
  public.questions,
  public.question_options,
  public.simulations,
  public.simulation_questions,
  public.user_question_answers,
  public.user_question_reviews,
  public.user_simulations,
  public.user_simulation_answers,
  public.study_plans,
  public.study_plan_items,
  public.user_topic_performance
to authenticated;

grant insert, update on table public.profiles to authenticated;

grant insert on table public.user_question_answers to authenticated;
grant insert, update, delete on table public.user_question_reviews to authenticated;
grant insert, update, delete on table public.user_simulations to authenticated;
grant insert, update on table public.user_simulation_answers to authenticated;
grant insert, update, delete on table public.study_plans to authenticated;
grant insert, update, delete on table public.study_plan_items to authenticated;
grant insert, update on table public.user_topic_performance to authenticated;
