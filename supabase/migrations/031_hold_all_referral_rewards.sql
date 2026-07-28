-- 031: hold both referral rewards for the refund safety window.

create or replace function public.grant_referred_referral_bonus(
  target_referral_id uuid,
  target_order_id uuid,
  input_provider_payment_id text default null
)
returns public.referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  target_referral public.referrals%rowtype;
begin
  select *
  into target_referral
  from public.referrals
  where id = target_referral_id
  for update;

  if not found then
    raise exception 'referral not found';
  end if;

  if target_referral.status in ('cancelled', 'refunded', 'blocked') then
    return target_referral;
  end if;

  update public.referrals
  set status = case
        when referred_reward_granted_at is not null
          and referrer_reward_granted_at is not null then 'reward_granted'
        else 'pending_release'
      end,
      order_id = coalesce(order_id, target_order_id),
      provider_payment_id = coalesce(input_provider_payment_id, provider_payment_id),
      purchased_at = coalesce(purchased_at, now()),
      reward_available_at = coalesce(reward_available_at, now() + interval '7 days')
  where id = target_referral.id
  returning * into target_referral;

  return target_referral;
end;
$$;

create or replace function public.process_pending_referral_rewards(
  target_referrer_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_referral public.referrals%rowtype;
  account public.credit_accounts;
  referred_ledger public.credit_ledger%rowtype;
  referrer_ledger public.credit_ledger%rowtype;
  processed_count integer := 0;
begin
  for target_referral in
    select *
    from public.referrals
    where status = 'pending_release'
      and (
        referred_reward_granted_at is null
        or referrer_reward_granted_at is null
      )
      and reward_available_at <= now()
      and review_status = 'clear'
      and (target_referrer_user_id is null or referrer_user_id = target_referrer_user_id)
    order by reward_available_at, id
    for update skip locked
  loop
    referred_ledger := null;
    referrer_ledger := null;

    if target_referral.referred_reward_granted_at is null then
      select *
      into referred_ledger
      from public.credit_ledger
      where reference_type = 'referral'
        and reference_id = target_referral.id
        and reason = 'referral_referred_bonus'
      limit 1;

      if not found then
        account := public.ensure_referral_credit_account(target_referral.referred_user_id);

        update public.credit_accounts
        set balance = balance + target_referral.referred_bonus_credits
        where user_id = target_referral.referred_user_id
        returning * into account;

        insert into public.credit_ledger (
          user_id,
          amount,
          balance_after,
          reason,
          reference_type,
          reference_id,
          metadata
        )
        values (
          target_referral.referred_user_id,
          target_referral.referred_bonus_credits,
          account.balance,
          'referral_referred_bonus',
          'referral',
          target_referral.id,
          jsonb_build_object(
            'referral_id', target_referral.id,
            'order_id', target_referral.order_id,
            'provider_payment_id', target_referral.provider_payment_id,
            'reward_role', 'referred',
            'source', 'indique_e_ganhe'
          )
        )
        returning * into referred_ledger;
      end if;

      update public.referrals
      set referred_reward_granted_at = coalesce(referred_reward_granted_at, now()),
          referred_reward_ledger_id = coalesce(referred_reward_ledger_id, referred_ledger.id)
      where id = target_referral.id
      returning * into target_referral;

      insert into public.product_events (user_id, event_name, route, metadata)
      values (
        target_referral.referred_user_id,
        'referral_bonus_granted',
        '/api/referrals/process-pending',
        jsonb_build_object(
          'referral_id', target_referral.id,
          'reward_role', 'referred',
          'credits', target_referral.referred_bonus_credits
        )
      );
    end if;

    if target_referral.referrer_reward_granted_at is null then
      select *
      into referrer_ledger
      from public.credit_ledger
      where reference_type = 'referral'
        and reference_id = target_referral.id
        and reason = 'referral_referrer_bonus'
      limit 1;

      if not found then
        account := public.ensure_referral_credit_account(target_referral.referrer_user_id);

        update public.credit_accounts
        set balance = balance + target_referral.referrer_reward_credits
        where user_id = target_referral.referrer_user_id
        returning * into account;

        insert into public.credit_ledger (
          user_id,
          amount,
          balance_after,
          reason,
          reference_type,
          reference_id,
          metadata
        )
        values (
          target_referral.referrer_user_id,
          target_referral.referrer_reward_credits,
          account.balance,
          'referral_referrer_bonus',
          'referral',
          target_referral.id,
          jsonb_build_object(
            'referral_id', target_referral.id,
            'order_id', target_referral.order_id,
            'provider_payment_id', target_referral.provider_payment_id,
            'reward_role', 'referrer',
            'source', 'indique_e_ganhe'
          )
        )
        returning * into referrer_ledger;
      end if;

      update public.referrals
      set referrer_reward_granted_at = coalesce(referrer_reward_granted_at, now()),
          referrer_reward_ledger_id = coalesce(referrer_reward_ledger_id, referrer_ledger.id)
      where id = target_referral.id
      returning * into target_referral;

      insert into public.product_events (user_id, event_name, route, metadata)
      values (
        target_referral.referrer_user_id,
        'referral_bonus_granted',
        '/api/referrals/process-pending',
        jsonb_build_object(
          'referral_id', target_referral.id,
          'reward_role', 'referrer',
          'credits', target_referral.referrer_reward_credits
        )
      );
    end if;

    update public.referrals
    set status = case
          when referred_reward_granted_at is not null
            and referrer_reward_granted_at is not null then 'reward_granted'
          else 'pending_release'
        end
    where id = target_referral.id;

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$$;
