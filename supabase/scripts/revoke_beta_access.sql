-- Revoga acesso beta manual por e-mail e retorna a conta para unpaid.
-- Execute apenas no SQL Editor do Supabase com permissao administrativa.

with target_user as (
  select id
  from auth.users
  where lower(email) = lower('beta.aluno@example.com')
  limit 1
)
update public.profiles p
set access_level = 'unpaid',
    beta_tester = false,
    access_expires_at = null
from target_user
where p.id = target_user.id
  and p.access_level = 'beta'
returning p.id, p.email, p.access_level, p.beta_tester, p.access_expires_at;
