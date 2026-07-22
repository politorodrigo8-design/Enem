-- Administrative one-off: promote the existing Rodrigo account to admin.
-- Run against the linked remote Supabase project with administrative privileges.
-- This script intentionally updates exactly one existing auth user/profile.

begin;

do $$
declare
  target_email constant text := 'rodrigo@nexoenem.com';
  target_user_id uuid;
  matching_users integer;
  updated_profiles integer;
begin
  select count(*)
  into matching_users
  from auth.users
  where lower(email) = lower(target_email);

  if matching_users <> 1 then
    raise exception 'Expected exactly one auth.users row for %, found %', target_email, matching_users;
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(target_email);

  update public.profiles
  set access_level = 'admin'
  where id = target_user_id;

  get diagnostics updated_profiles = row_count;

  if updated_profiles <> 1 then
    raise exception 'Expected exactly one public.profiles row for %, updated %', target_email, updated_profiles;
  end if;
end $$;

commit;

select
  u.id,
  u.email,
  p.full_name,
  p.access_level,
  p.access_expires_at,
  p.beta_tester,
  public.has_platform_access(u.id) as has_platform_access,
  public.is_admin(u.id) as is_admin
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('rodrigo@nexoenem.com');
