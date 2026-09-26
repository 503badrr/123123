-- Atomic payment-webhook processor + generic rate limiting.
-- Defines public.switch_process_payment_webhook (already referenced by the Telr
-- webhook route and by the generated Supabase types) and a reusable
-- consume_rate_limit counter used by hosted checkout.

-- ============================================================
-- Rate limiting
-- ============================================================
create table if not exists public.rate_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket_key, window_start)
);
create index if not exists idx_rate_limits_window on public.rate_limits(window_start);
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limits to service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'not authorized';
  end if;
  if coalesce(trim(p_key), '') = '' or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (bucket_key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  -- Opportunistic cleanup of stale windows (bounded by the index).
  delete from public.rate_limits where window_start < now() - interval '2 days';

  return v_count <= p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- ============================================================
-- Payment webhook processor
-- ============================================================
-- Idempotent and replay-safe:
--   * (provider, event_id) is claimed atomically in webhook_events; processed
--     duplicates return immediately without side effects.
--   * The order row is locked for the whole transition, and an order that is
--     already paid/fulfilled is never re-delivered even for a fresh event id.
--   * On capture the paid amount must match the order total (1 halala slack).
-- Delivery claims available digital codes with FOR UPDATE SKIP LOCKED, marks
-- them delivered against the order item, and returns them so that the caller
-- (server-side webhook route) can email the customer. Codes are returned only
-- to the service-role caller and are never written to logs or event payloads.
create or replace function public.switch_process_payment_webhook(
  p_provider text,
  p_event_id text,
  p_provider_payment_id text,
  p_order_reference text,
  p_payment_status text,
  p_amount numeric default null,
  p_currency text default null,
  p_payload jsonb default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_event_pk uuid;
  v_already_processed boolean;
  v_order public.orders%rowtype;
  v_payment_id uuid;
  v_status public.payment_status;
  v_final_order_status public.order_status;
  v_item record;
  v_code record;
  v_codes jsonb := '[]'::jsonb;
  v_missing integer := 0;
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'not authorized';
  end if;
  if coalesce(trim(p_provider), '') = '' or coalesce(trim(p_event_id), '') = '' then
    raise exception 'invalid webhook identity';
  end if;

  -- 1) Claim the event atomically (idempotency + duplicate delivery guard).
  insert into public.webhook_events (provider, event_id, payload, processed)
  values (p_provider, p_event_id, coalesce(p_payload, '{}'::jsonb), false)
  on conflict (provider, event_id) do nothing
  returning id into v_event_pk;

  if v_event_pk is null then
    select id, processed into v_event_pk, v_already_processed
    from public.webhook_events
    where provider = p_provider and event_id = p_event_id
    for update;
    if v_already_processed then
      return jsonb_build_object('ok', true, 'duplicate', true);
    end if;
  end if;

  -- 2) Normalize the provider status onto our payment_status enum.
  v_status := (case lower(coalesce(p_payment_status, ''))
    when 'captured'   then 'paid'
    when 'paid'       then 'paid'
    when 'authorized' then 'authorized'
    when 'failed'     then 'failed'
    when 'declined'   then 'failed'
    when 'cancelled'  then 'failed'
    when 'refunded'   then 'refunded'
    else 'pending'
  end)::public.payment_status;

  -- 3) Locate and lock the order by its public reference (order_number).
  select * into v_order
  from public.orders
  where order_number = nullif(trim(p_order_reference), '')
  for update;

  if not found then
    update public.webhook_events
    set processed = true, error = 'order not found: ' || coalesce(p_order_reference, '(empty)')
    where id = v_event_pk;
    return jsonb_build_object('ok', true, 'order_found', false);
  end if;

  -- 4) Fail closed for captured payments unless amount and currency are
  -- present and match the locked order.
  if v_status = 'paid' and (
    p_amount is null or nullif(trim(coalesce(p_currency, '')), '') is null
  ) then
    update public.webhook_events
    set processed = true, error = 'captured payment missing amount or currency'
    where id = v_event_pk;
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('payment.missing_totals', 'order', v_order.id,
            jsonb_build_object('provider', p_provider, 'event_id', p_event_id));
    return jsonb_build_object('ok', false, 'error', 'missing_payment_totals');
  end if;

  if v_status = 'paid' and upper(trim(p_currency)) <> upper(v_order.currency) then
    update public.webhook_events
    set processed = true,
        error = format('currency mismatch: webhook %s, order %s', p_currency, v_order.currency)
    where id = v_event_pk;
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('payment.currency_mismatch', 'order', v_order.id,
            jsonb_build_object('provider', p_provider, 'event_id', p_event_id,
                               'webhook_currency', p_currency, 'order_currency', v_order.currency));
    return jsonb_build_object('ok', false, 'error', 'currency_mismatch');
  end if;

  if v_status = 'paid' and abs(p_amount - v_order.total) > 0.01 then
    update public.webhook_events
    set processed = true,
        error = format('amount mismatch: webhook %s, order %s', p_amount, v_order.total)
    where id = v_event_pk;
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('payment.amount_mismatch', 'order', v_order.id,
            jsonb_build_object('provider', p_provider, 'event_id', p_event_id,
                               'webhook_amount', p_amount, 'order_total', v_order.total));
    return jsonb_build_object('ok', false, 'error', 'amount_mismatch');
  end if;

  -- 5) Update the latest checkout payment row for this provider. A retry
  -- can leave more than one historical row, so never use an unbounded
  -- UPDATE ... RETURNING INTO here.
  select id into v_payment_id
  from public.payments
  where order_id = v_order.id and provider = p_provider
  order by updated_at desc, id desc
  limit 1
  for update;

  if v_payment_id is null then
    insert into public.payments (order_id, provider, provider_payment_id, status, amount, currency, raw_payload)
    values (v_order.id, p_provider, nullif(trim(p_provider_payment_id), ''), v_status,
            coalesce(p_amount, v_order.total), coalesce(nullif(trim(p_currency), ''), v_order.currency), p_payload)
    returning id into v_payment_id;
  else
    update public.payments
    set status = v_status,
        provider_payment_id = coalesce(nullif(trim(p_provider_payment_id), ''), provider_payment_id),
        amount = coalesce(p_amount, amount),
        currency = coalesce(nullif(trim(p_currency), ''), currency),
        raw_payload = coalesce(p_payload, raw_payload),
        updated_at = now()
    where id = v_payment_id;
  end if;

  v_final_order_status := v_order.status;

  if v_status = 'paid' then
    if v_order.status in ('paid', 'processing', 'fulfilled') then
      -- A different event id for an already-captured order: acknowledge without
      -- re-delivering codes.
      update public.webhook_events set processed = true where id = v_event_pk;
      return jsonb_build_object('ok', true, 'already_paid', true,
                                'order_number', v_order.order_number,
                                'order_status', v_order.status::text);
    end if;

    -- 6) Deliver one code per unit for every order item.
    for v_item in
      select id, product_id, product_name, quantity
      from public.order_items
      where order_id = v_order.id
    loop
      for i in 1..v_item.quantity loop
        select id, code_ciphertext into v_code
        from public.digital_codes
        where product_id = v_item.product_id
          and status = 'available'
          and (expires_at is null or expires_at > now())
        order by created_at
        for update skip locked
        limit 1;

        if v_code.id is null then
          v_missing := v_missing + 1;
        else
          update public.digital_codes
          set status = 'delivered', order_item_id = v_item.id,
              delivered_at = now(), expires_at = null, updated_at = now()
          where id = v_code.id;
          v_codes := v_codes || jsonb_build_object(
            'product_name', v_item.product_name,
            'code', v_code.code_ciphertext
          );
        end if;
        v_code := null;
      end loop;
    end loop;

    v_final_order_status := case when v_missing = 0 then 'fulfilled' else 'processing' end;
    update public.orders set status = v_final_order_status, updated_at = now() where id = v_order.id;

    if v_order.user_id is not null then
      insert into public.notifications (user_id, title, body, link)
      values (v_order.user_id, 'تم تأكيد الدفع',
              'طلبك ' || v_order.order_number ||
              case when v_missing = 0 then ' اكتمل وتم تسليم المنتجات الرقمية.'
                   else ' مؤكد وجاري تجهيز المنتجات الرقمية.' end,
              '/account');
    end if;

    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('payment.captured', 'order', v_order.id,
            jsonb_build_object('provider', p_provider, 'event_id', p_event_id,
                               'delivered', jsonb_array_length(v_codes), 'missing_codes', v_missing));
  elsif v_status = 'refunded' then
    v_final_order_status := 'refunded';
    update public.orders set status = 'refunded', updated_at = now() where id = v_order.id;
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('payment.refunded', 'order', v_order.id,
            jsonb_build_object('provider', p_provider, 'event_id', p_event_id));
  elsif v_status = 'failed' then
    -- Keep the order pending: the customer may retry payment for the same order.
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('payment.failed', 'order', v_order.id,
            jsonb_build_object('provider', p_provider, 'event_id', p_event_id));
  end if;

  update public.webhook_events set processed = true where id = v_event_pk;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'order_status', v_final_order_status::text,
    'payment_status', v_status::text,
    'customer_email', v_order.customer_email,
    'customer_name', v_order.customer_name,
    'total', v_order.total,
    'currency', v_order.currency,
    'missing_codes', v_missing,
    'codes', v_codes
  );
end;
$$;
revoke all on function public.switch_process_payment_webhook(text, text, text, text, text, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.switch_process_payment_webhook(text, text, text, text, text, numeric, text, jsonb) to service_role;
