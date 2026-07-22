-- 018: additional credit packages through the existing payment flow.

alter table public.products
  add column if not exists product_kind text not null default 'access',
  add column if not exists credit_amount integer;

alter table public.products
  drop constraint if exists products_product_kind_check;

alter table public.products
  add constraint products_product_kind_check check (
    (
      product_kind = 'access'
      and credit_amount is null
    )
    or (
      product_kind = 'credit_package'
      and credit_amount is not null
      and credit_amount > 0
    )
  );

update public.products
set product_kind = 'access',
    credit_amount = null
where slug = 'nexoenem-completo-2026';

insert into public.products (
  product_name,
  slug,
  regular_price_cents,
  sale_price_cents,
  sale_starts_at,
  sale_ends_at,
  access_valid_until,
  active,
  launch_ready,
  checkout_provider,
  product_kind,
  credit_amount
)
values
  (
    'Pacote 20 creditos',
    'creditos-20',
    1990,
    null,
    null,
    null,
    '2026-11-30 23:59:59-03'::timestamptz,
    true,
    true,
    'mercado_pago',
    'credit_package',
    20
  ),
  (
    'Pacote 50 creditos',
    'creditos-50',
    3990,
    null,
    null,
    null,
    '2026-11-30 23:59:59-03'::timestamptz,
    true,
    true,
    'mercado_pago',
    'credit_package',
    50
  ),
  (
    'Pacote 100 creditos',
    'creditos-100',
    6990,
    null,
    null,
    null,
    '2026-11-30 23:59:59-03'::timestamptz,
    true,
    true,
    'mercado_pago',
    'credit_package',
    100
  )
on conflict (slug) do update set
  product_name = excluded.product_name,
  regular_price_cents = excluded.regular_price_cents,
  active = excluded.active,
  launch_ready = excluded.launch_ready,
  checkout_provider = excluded.checkout_provider,
  product_kind = excluded.product_kind,
  credit_amount = excluded.credit_amount,
  updated_at = now();

create unique index if not exists credit_ledger_one_purchase_per_order_unique
  on public.credit_ledger (reference_type, reference_id, reason)
  where reference_type = 'order'
    and reason = 'purchase'
    and reference_id is not null;

create or replace function public.grant_paid_access_for_order(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_product public.products%rowtype;
  account public.credit_accounts;
  purchase_ledger public.credit_ledger;
begin
  select * into target_order
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  select * into target_product
  from public.products
  where id = target_order.product_id;

  if not found then
    raise exception 'product not found';
  end if;

  update public.orders
  set status = 'approved',
      paid_at = coalesce(paid_at, now()),
      expires_at = case
        when target_product.product_kind = 'access' then target_product.access_valid_until
        else target_order.expires_at
      end
  where id = target_order.id;

  if target_product.product_kind = 'credit_package' then
    if target_product.credit_amount is null or target_product.credit_amount <= 0 then
      raise exception 'invalid credit package';
    end if;

    insert into public.credit_accounts (user_id, balance, monthly_allowance)
    values (target_order.user_id, 50, 50)
    on conflict (user_id) do nothing;

    select *
    into account
    from public.credit_accounts
    where user_id = target_order.user_id
    for update;

    insert into public.credit_ledger (
      user_id,
      amount,
      balance_after,
      reason,
      reference_type,
      metadata
    )
    select
      target_order.user_id,
      account.monthly_allowance,
      account.balance,
      'initial_allowance',
      'credit_account',
      jsonb_build_object('cycle_started_at', account.cycle_started_at)
    where not exists (
      select 1
      from public.credit_ledger cl
      where cl.user_id = target_order.user_id
        and cl.reason = 'initial_allowance'
    );

    select *
    into purchase_ledger
    from public.credit_ledger
    where user_id = target_order.user_id
      and reason = 'purchase'
      and reference_type = 'order'
      and reference_id = target_order.id
    limit 1;

    if not found then
      update public.credit_accounts
      set balance = balance + target_product.credit_amount
      where user_id = target_order.user_id
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
        target_order.user_id,
        target_product.credit_amount,
        account.balance,
        'purchase',
        'order',
        target_order.id,
        jsonb_build_object(
          'product_id', target_product.id,
          'product_slug', target_product.slug,
          'amount_cents', target_order.amount_cents
        )
      );

      insert into public.product_events (user_id, event_name, route, metadata)
      values (
        target_order.user_id,
        'credit_package_purchased',
        '/api/payments/webhook',
        jsonb_build_object(
          'order_id', target_order.id,
          'credits', target_product.credit_amount
        )
      );
    end if;

    return;
  end if;

  update public.profiles
  set access_level = 'paid',
      access_expires_at = target_product.access_valid_until,
      beta_tester = false
  where id = target_order.user_id
    and access_level <> 'admin';

  insert into public.product_events (user_id, event_name, route, metadata)
  values
    (target_order.user_id, 'payment_approved', '/api/payments/webhook', jsonb_build_object('order_id', target_order.id)),
    (target_order.user_id, 'access_granted', '/api/payments/webhook', jsonb_build_object('access_level', 'paid'));
end;
$$;

create or replace function public.revoke_paid_access_for_order(
  target_order_id uuid,
  target_status text default 'refunded'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  target_product public.products%rowtype;
begin
  if target_status not in ('refunded', 'charged_back', 'cancelled', 'expired', 'rejected') then
    raise exception 'invalid revocation status';
  end if;

  select * into target_order
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  select * into target_product
  from public.products
  where id = target_order.product_id;

  if not found then
    raise exception 'product not found';
  end if;

  update public.orders
  set status = target_status
  where id = target_order.id;

  if target_product.product_kind = 'credit_package' then
    return;
  end if;

  update public.profiles
  set access_level = 'unpaid',
      access_expires_at = null,
      beta_tester = false
  where id = target_order.user_id
    and access_level = 'paid';

  insert into public.product_events (user_id, event_name, route, metadata)
  values
    (target_order.user_id, 'access_revoked', '/api/payments/webhook', jsonb_build_object('status', target_status));
end;
$$;

alter table public.product_events
  drop constraint if exists product_events_event_name_check;

alter table public.product_events
  add constraint product_events_event_name_check check (
    event_name in (
      'signup_completed',
      'checkout_started',
      'order_created',
      'payment_pending',
      'payment_approved',
      'payment_rejected',
      'payment_refunded',
      'access_granted',
      'access_revoked',
      'onboarding_started',
      'onboarding_completed',
      'diagnosis_started',
      'diagnosis_completed',
      'question_answered',
      'high_priority_training_started',
      'high_priority_question_completed',
      'simulation_started',
      'simulation_completed',
      'study_plan_generated',
      'study_plan_item_completed',
      'premium_block_seen',
      'beta_application_submitted',
      'feedback_submitted',
      'essay_submitted',
      'essay_corrected',
      'essay_cancelled',
      'ai_question_explanation_generated',
      'ai_performance_analysis_generated',
      'ai_study_plan_generated',
      'credit_package_purchased'
    )
  );
