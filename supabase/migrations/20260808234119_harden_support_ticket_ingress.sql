-- Harden support-ticket ingress on production.
-- Public contact messages already go through the server-only contact handler with rate limiting,
-- so direct anonymous inserts into support_tickets are unnecessary attack surface.

revoke insert on table public.support_tickets from anon;
revoke insert on table public.support_tickets from public;

alter policy support_tickets_insert_own
  on public.support_tickets
  to authenticated
  with check (
    coalesce((((select auth.jwt())->>'is_anonymous')::boolean), false) is false
    and user_id = (select auth.uid())
  );
