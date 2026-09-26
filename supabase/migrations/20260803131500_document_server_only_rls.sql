-- Make the server-only intent explicit for tables accessed exclusively through
-- service-role server functions. RLS already denied access when no policies
-- existed; these policies preserve that behavior while making the contract
-- auditable and visible to the Supabase advisor.

drop policy if exists "contact_messages_server_only" on public.contact_messages;
create policy "contact_messages_server_only"
  on public.contact_messages
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "rate_limits_server_only" on public.rate_limits;
create policy "rate_limits_server_only"
  on public.rate_limits
  for all
  to anon, authenticated
  using (false)
  with check (false);
