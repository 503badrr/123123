-- Switch payment refunds ledger.
-- All refund writes are server-only. The reservation RPC locks the payment row
-- so concurrent partial refunds cannot exceed the captured amount.

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_payment_id text not null,
  provider_refund_id text,
  provider_status text,
  amount numeric(14,3) not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  reason text not null check (reason in ('duplicate', 'fraudulent', 'requested_by_customer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'refunded', 'failed', 'rejected')),
  requested_by uuid references auth.users(id) on delete set null,
  correlation_id uuid not null unique,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_refunds_provider_refund_uidx
  on public.payment_refunds(provider, provider_refund_id)
  where provider_refund_id is not null;
create index if not exists payment_refunds_payment_idx
  on public.payment_refunds(payment_id, created_at desc);
create index if not exists payment_refunds_order_idx
  on public.payment_refunds(order_id, created_at desc);

alter table public.payment_refunds enable row level security;
revoke all on table public.payment_refunds from public, anon, authenticated;
grant select, insert, update on table public.payment_refunds to service_role;

create or replace function public.switch_reserve_payment_refund(
  p_payment_id uuid,
  p_amount numeric,
  p_reason text,
  p_requested_by uuid,
  p_correlation_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_refunded numeric := 0;
  v_refund_id uuid;
  v_order_number text;
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'not authorized';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid refund amount';
  end if;
  if p_reason not in ('duplicate', 'fraudulent', 'requested_by_customer') then
    raise exception 'invalid refund reason';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then raise exception 'payment not found'; end if;
  if v_payment.provider <> 'tap' then raise exception 'refund provider is not tap'; end if;
  if v_payment.status <> 'paid' then raise exception 'payment is not paid'; end if;
  if coalesce(trim(v_payment.provider_payment_id), '') = '' then
    raise exception 'payment provider reference missing';
  end if;

  select coalesce(sum(amount), 0) into v_refunded
  from public.payment_refunds
  where payment_id = p_payment_id
    and status in ('pending', 'accepted', 'refunded');

  if p_amount > (v_payment.amount - v_refunded) + 0.001 then
    raise exception 'refund exceeds remaining captured amount';
  end if;

  select order_number into v_order_number from public.orders where id = v_payment.order_id;

  insert into public.payment_refunds (
    payment_id, order_id, provider, provider_payment_id, amount, currency,
    reason, status, requested_by, correlation_id
  ) values (
    v_payment.id, v_payment.order_id, v_payment.provider, v_payment.provider_payment_id,
    p_amount, upper(v_payment.currency), p_reason, 'pending', p_requested_by, p_correlation_id
  ) returning id into v_refund_id;

  return jsonb_build_object(
    'refund_id', v_refund_id,
    'order_id', v_payment.order_id,
    'order_number', v_order_number,
    'provider_payment_id', v_payment.provider_payment_id,
    'amount', p_amount,
    'currency', upper(v_payment.currency),
    'correlation_id', p_correlation_id
  );
end;
$$;

revoke all on function public.switch_reserve_payment_refund(uuid, numeric, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.switch_reserve_payment_refund(uuid, numeric, text, uuid, uuid)
  to service_role;
