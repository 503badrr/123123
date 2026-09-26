-- Restore authenticated access to the hardened admin predicate. The function
-- remains unavailable to PUBLIC and anon; service_role retains explicit access.
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- Policies invoking is_admin() must not target PUBLIC because anon intentionally
-- cannot execute the predicate. Restrict them to signed-in users instead.
alter policy "audit_logs_admin_only"
  on public.audit_logs
  to authenticated;

alter policy "digital_codes_admin_only"
  on public.digital_codes
  to authenticated;

alter policy "order_items_select_own_or_admin"
  on public.order_items
  to authenticated;

alter policy "orders_select_own_or_admin"
  on public.orders
  to authenticated;

alter policy "payments_admin_delete"
  on public.payments
  to authenticated;

alter policy "payments_admin_insert"
  on public.payments
  to authenticated;

alter policy "payments_admin_update"
  on public.payments
  to authenticated;

alter policy "payments_select_own_or_admin"
  on public.payments
  to authenticated;

alter policy "profiles_select_own_or_admin"
  on public.profiles
  to authenticated;

alter policy "support_tickets_admin_update"
  on public.support_tickets
  to authenticated;

alter policy "support_tickets_select_own_or_admin"
  on public.support_tickets
  to authenticated;

alter policy "webhook_events_admin_select"
  on public.webhook_events
  to authenticated;

-- Retain webhook_events_pkey, webhook_events_provider_event_id_key, and
-- idx_webhook_events_processed. The following indexes duplicate those keys.
drop index if exists public.idx_webhook_events_provider_event_id;
drop index if exists public.webhook_events_id_idx;
drop index if exists public.webhook_events_id_idx1;
drop index if exists public.webhook_events_id_idx2;
drop index if exists public.webhook_events_id_idx3;
drop index if exists public.webhook_events_id_idx4;
