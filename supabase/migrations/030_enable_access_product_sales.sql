-- Libera a venda do produto de acesso.
--
-- A migração 005 cadastra o produto com launch_ready = false e o seu
-- "on conflict do update" não atualiza a coluna, então nenhuma migração jamais
-- ligava a venda: em produção o botão de pagar do /checkout nascia desabilitado
-- e a API de criação de pagamento respondia 409. Só os pacotes de crédito
-- (migração 018) subiam com launch_ready = true, ou seja, dava para comprar
-- crédito avulso mas não dava para comprar o acesso.

update public.products
set
  launch_ready = true,
  updated_at = now()
where product_kind = 'access'
  and launch_ready is distinct from true;
