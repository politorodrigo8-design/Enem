grant select on table public.subjects to authenticated;
grant select on table public.topics to authenticated;
grant select on table public.questions to authenticated;
grant select on table public.question_options to authenticated;
grant select on table public.simulations to authenticated;
grant select on table public.simulation_questions to authenticated;

grant select, insert, update on table public.profiles to authenticated;

grant select, insert, update, delete on table public.user_question_answers to authenticated;
grant select, insert, update, delete on table public.user_question_reviews to authenticated;
grant select, insert, update, delete on table public.user_simulations to authenticated;
grant select, insert, update, delete on table public.user_simulation_answers to authenticated;
grant select, insert, update, delete on table public.study_plans to authenticated;
grant select, insert, update, delete on table public.study_plan_items to authenticated;
grant select, insert, update, delete on table public.user_topic_performance to authenticated;

grant usage, select on all sequences in schema public to authenticated;
