-- Wallet + loyalty ledger, ready for when store credit is enabled.
-- Clients may only READ their own balance and history. All writes go through
-- the service role (server functions / payment processor) so a balance can
-- never be edited from the browser.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'wallet_tx_kind') then
    create type public.wallet_tx_kind as enum
      ('topup', 'purchase', 'refund', 'adjustment', 'loyalty_earn', 'loyalty_redeem');
  end if;
end $$;

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.wallet_tx_kind not null,
  amount numeric(12,2) not null,
  points_delta integer not null default 0,
  reference text,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_transactions_user_created
  on public.wallet_transactions(user_id, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

revoke all on table public.wallets from anon, authenticated;
revoke all on table public.wallet_transactions from anon, authenticated;
grant select on table public.wallets to authenticated;
grant select on table public.wallet_transactions to authenticated;
grant select, insert, update, delete on table public.wallets to service_role;
grant select, insert, update, delete on table public.wallet_transactions to service_role;

drop policy if exists wallets_select_own_or_admin on public.wallets;
create policy wallets_select_own_or_admin on public.wallets
  for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

drop policy if exists wallet_transactions_select_own_or_admin on public.wallet_transactions;
create policy wallet_transactions_select_own_or_admin on public.wallet_transactions
  for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

drop trigger if exists set_wallets_updated_at on public.wallets;
create trigger set_wallets_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();
