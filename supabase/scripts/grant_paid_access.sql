-- Libera acesso paid manual por e-mail, sem criar pagamento aprovado artificial.
-- Use para cortesias operacionais ou regularizacao conferida fora do gateway.

with target_user as (
  select id
  from auth.users
  where lower(email) = lower('cliente@example.com')
  limit 1
)
update public.profiles p
set access_level = 'paid',
    beta_tester = false,
    access_expires_at = '2026-11-30 23:59:59-03'::timestamptz
from target_user
where p.id = target_user.id
  and p.access_level <> 'admin'
returning p.id, p.email, p.access_level, p.beta_tester, p.access_expires_at;
