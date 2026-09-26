# Switch | سويتش — Supabase Production Security Review

_Last verified: 2026-08-09_

## Production status

The connected Supabase production project is active and healthy. The production database, Auth surface, RLS policies, Edge Function, grants, migrations, logs, and Security/Performance Advisors were reviewed directly.

## Verified controls

- Row Level Security is enabled on every application table in the `public` schema.
- Browser code uses only the Supabase publishable key.
- `SUPABASE_SERVICE_ROLE_KEY` is restricted to server-only code and environment variables.
- Sensitive `SECURITY DEFINER` database functions are restricted to `service_role`, except the deliberate internal `private.is_admin()` predicate used by the authenticated admin authorization wrapper and RLS policies.
- The public `is_admin()` RPC is a `SECURITY INVOKER` wrapper; the `/admin` route checks the authenticated user and this RPC before allowing access.
- Anonymous direct inserts into `support_tickets` are disabled. Authenticated inserts require a permanent user and `user_id = auth.uid()`.
- Public contact submissions go through a server function with Zod validation, hashed-IP/per-email rate limiting, and fail-closed behavior.
- The Moyasar webhook validates an HMAC signature before processing data.
- Payment webhook processing is service-role-only and validates amount/currency before fulfillment.
- Webhook event idempotency is enforced by a unique `(provider, event_id)` constraint.
- Payment provider IDs are uniquely constrained when present.
- No Supabase Storage buckets currently exist, so there is no Storage policy surface to harden.
- Password creation/reset UI enforces at least 12 characters with uppercase, lowercase, numeric, and special-character requirements. Existing-user sign-in is intentionally not blocked by this client-side rule.
- The latest NodeJS Quality Gate passes typecheck, lint, tests, production build, and Cloudflare production/preview dry-runs.

## Current Security Advisor findings

### Leaked Password Protection

Still reported as disabled. This is expected while the project remains on the Supabase Free plan; the feature requires Pro or above. It is not a development blocker.

### `private.is_admin()` SECURITY DEFINER warning

Known and reviewed. The function is intentionally internal, uses an empty `search_path`, checks `auth.uid()` against active staff roles, is unavailable to `anon`, and is reached through the public SECURITY INVOKER wrapper used by the app and RLS policies. Do not revoke it without replacing the admin authorization architecture.

### `cron.job` / `cron.job_run_details` anonymous-policy warnings

Reviewed as extension-level warnings. The `cron` schema itself is not granted to `anon` or `authenticated`; active cron jobs execute as `postgres`. Do not modify pg_cron extension policies only to silence the Advisor.

## Performance Advisor

The current findings are informational unused-index notices. The project has very little production traffic/data, so these indexes should not be removed merely because they have not yet accumulated usage statistics.

## Remaining owner actions

1. In Supabase Auth settings, mirror the app policy at the Auth-server layer: minimum password length `12`, require uppercase + lowercase + number + symbol, and keep email confirmation enabled.
2. Enable reauthentication/current-password protection for password changes where available in the project Auth settings.
3. Assign the intended production account an `owner`/`admin`/`staff` role only after explicit owner authorization. At the last review there were no active staff-role profiles, so `/admin` correctly denies access.
4. When/if the project upgrades to Supabase Pro, enable Leaked Password Protection and rerun the Security Advisor.

## Launch interpretation

Supabase Free is sufficient to continue development and staging. Leaked Password Protection is a deferred Pro-only hardening item, not a blocker for ongoing build work. Production launch should still require payment-provider production secrets, signed webhook verification with real provider events, admin/Codes validation, and domain/DNS/SSL verification in the broader Switch launch runbook.
