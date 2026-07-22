-- Persistent rate limit buckets for server-side sensitive actions.

create table if not exists public.rate_limit_buckets (
  operation text not null,
  identifier_hash text not null,
  window_start timestamptz not null default now(),
  expires_at timestamptz not null,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (operation, identifier_hash),
  constraint rate_limit_buckets_operation_check check (length(btrim(operation)) between 2 and 80),
  constraint rate_limit_buckets_identifier_hash_check check (identifier_hash ~ '^[a-f0-9]{64}$')
);

alter table public.rate_limit_buckets enable row level security;

drop policy if exists "rate_limit_buckets_no_client_access" on public.rate_limit_buckets;
create policy "rate_limit_buckets_no_client_access" on public.rate_limit_buckets
  for all
  using (false)
  with check (false);

create index if not exists rate_limit_buckets_expires_at_idx
  on public.rate_limit_buckets (expires_at);

drop function if exists public.consume_rate_limit(text, text, integer, integer);
create or replace function public.consume_rate_limit(
  input_operation text,
  input_identifier_hash text,
  input_limit integer,
  input_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_operation text := btrim(coalesce(input_operation, ''));
  normalized_hash text := lower(btrim(coalesce(input_identifier_hash, '')));
  now_value timestamptz := now();
  bucket public.rate_limit_buckets;
begin
  if auth.role() <> 'service_role' then
    raise exception 'rate limit admin access required';
  end if;

  if length(normalized_operation) < 2 or length(normalized_operation) > 80 then
    raise exception 'invalid rate limit operation';
  end if;

  if normalized_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid rate limit identifier';
  end if;

  if input_limit < 1 or input_limit > 10000 then
    raise exception 'invalid rate limit limit';
  end if;

  if input_window_seconds < 1 or input_window_seconds > 86400 then
    raise exception 'invalid rate limit window';
  end if;

  insert into public.rate_limit_buckets (
    operation,
    identifier_hash,
    window_start,
    expires_at,
    count
  )
  values (
    normalized_operation,
    normalized_hash,
    now_value,
    now_value + make_interval(secs => input_window_seconds),
    1
  )
  on conflict (operation, identifier_hash)
  do update
  set
    window_start = case
      when public.rate_limit_buckets.expires_at <= now_value then now_value
      else public.rate_limit_buckets.window_start
    end,
    expires_at = case
      when public.rate_limit_buckets.expires_at <= now_value
        then now_value + make_interval(secs => input_window_seconds)
      else public.rate_limit_buckets.expires_at
    end,
    count = case
      when public.rate_limit_buckets.expires_at <= now_value then 1
      else public.rate_limit_buckets.count + 1
    end,
    updated_at = now_value
  returning * into bucket;

  allowed := bucket.count <= input_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from bucket.expires_at - now_value))::integer)
  end;
  remaining := greatest(0, input_limit - bucket.count);

  return next;
end;
$$;

drop function if exists public.delete_expired_rate_limits();
create or replace function public.delete_expired_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'rate limit admin access required';
  end if;

  delete from public.rate_limit_buckets
  where expires_at < now() - interval '1 day';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on table public.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;

revoke all on function public.delete_expired_rate_limits()
  from public, anon, authenticated;
grant execute on function public.delete_expired_rate_limits()
  to service_role;
