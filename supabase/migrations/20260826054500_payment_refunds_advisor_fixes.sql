-- Advisor follow-up for payment_refunds.
-- Keep a covering index for the requested_by foreign key and an explicit
-- service-role-only RLS policy so Supabase advisors reflect the intended model.

create index if not exists payment_refunds_requested_by_idx
  on public.payment_refunds(requested_by)
  where requested_by is not null;

create policy "payment_refunds_service_role_only"
on public.payment_refunds
for all
to service_role
using (true)
with check (true);
