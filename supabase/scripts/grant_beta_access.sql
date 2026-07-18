-- Libera acesso beta manual por e-mail.
-- Execute apenas no SQL Editor do Supabase com permissao administrativa.

with target_user as (
  select id
  from auth.users
  where lower(email) = lower('beta.aluno@example.com')
  limit 1
)
update public.profiles p
set access_level = 'beta',
    beta_tester = true,
    access_expires_at = '2026-11-30 23:59:59-03'::timestamptz
from target_user
where p.id = target_user.id
returning p.id, p.email, p.access_level, p.beta_tester, p.access_expires_at;
