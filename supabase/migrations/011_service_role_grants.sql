-- 011: devolve DML ao service_role.
--
-- As migrations 002/003 concederam privilegios apenas a "authenticated", o que
-- removeu os defaults do service_role em todo o schema public. Sem isto, tudo
-- que roda com a service key falha com "permission denied": webhook de
-- pagamento (orders/payment_events/profiles), area editorial admin
-- (questions/question_options) e o importador de questoes.
--
-- RLS continua valendo para anon/authenticated; o service_role a ignora por
-- definicao, entao este grant nao amplia o que o cliente enxerga.

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
