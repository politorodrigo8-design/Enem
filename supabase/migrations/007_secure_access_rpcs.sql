-- 007_secure_access_rpcs.sql
--
-- As funções grant_paid_access_for_order / revoke_paid_access_for_order são
-- SECURITY DEFINER e, por padrão do Postgres/Supabase, ganham EXECUTE para
-- os papéis anon e authenticated. Sem este REVOKE, qualquer usuário logado
-- pode criar um pedido "pending" (permitido pela policy orders_insert_own_pending)
-- e chamar rpc('grant_paid_access_for_order', { target_order_id }) para se
-- conceder acesso pago sem pagar — bypass total do paywall. O webhook usa a
-- service_role key, que ignora estas restrições, então continua funcionando.
--
-- NÃO revogar has_platform_access nem current_product_price_cents: elas são
-- avaliadas dentro de policies RLS como o próprio usuário e precisam do EXECUTE.

revoke execute on function public.grant_paid_access_for_order(uuid)
  from public, anon, authenticated;

revoke execute on function public.revoke_paid_access_for_order(uuid, text)
  from public, anon, authenticated;

grant execute on function public.grant_paid_access_for_order(uuid)
  to service_role;

grant execute on function public.revoke_paid_access_for_order(uuid, text)
  to service_role;
