-- Revoga acesso paid manual por e-mail.
-- Nao altera contas beta ou admin.

with target_user as (
  select id
  from auth.users
  where lower(email) = lower('cliente@example.com')
  limit 1
)
update public.profiles p
set access_level = 'unpaid',
    beta_tester = false,
    access_expires_at = null
from target_user
where p.id = target_user.id
  and p.access_level = 'paid'
returning p.id, p.email, p.access_level, p.beta_tester, p.access_expires_at;
