# Switch Production Readiness Audit — 2026-08-03

## Executive status

**State:** merged release candidate; not yet fully launch-ready.

The production-readiness changes were verified on branch commit `1df8caf3a2b414d4654da647738049276d04204a` by NodeJS Quality Gate run #245, including typecheck, lint, tests, production build, and both Cloudflare dry-runs. PR #32 was then squash-merged to GitHub `main` as commit `4287b667139e92ea7c2e34348ec9db39ce9c87be`.

The production database received three backward-compatible security/performance migrations and all SQL assertions passed. Remaining launch gates are manual preview validation, Supabase leaked-password protection, production Tap verification, DNS/SSL confirmation, obsolete Vercel integration removal, and independent R2/MCP provisioning.

## Canonical source and domain

- GitHub source: `503badrr/cosmic-switch-preview`.
- Canonical branch: `main`.
- Readiness merge: PR #32 / `4287b667139e92ea7c2e34348ec9db39ce9c87be`.
- Lovable project: `Switch` (`75f64944-3d13-4e3b-b4db-e91543484ea8`).
- Lovable preview metadata referenced the audited `fe63822f` baseline before the readiness merge.
- Final domain: `swwiitch.com` and `www.swwiitch.com`.
- `switchsa.com` is no longer the configured production target in the repository.
- Deployment target: Cloudflare Worker `dark-disk-4155`.
- Vercel is not an authoritative deployment target.

## Issue #3 checklist reconciliation

| Original task | Current result |
| --- | --- |
| Sync/export latest Lovable code | Completed: Lovable and GitHub main were synchronized at the audited baseline. |
| Confirm final domain | Completed: `swwiitch.com`. |
| Add environment examples | Completed; both example files exist without populated secrets. |
| Add deployment/security/operations docs | Completed and merged through PR #32. |
| Add GitHub Actions CI | Completed: NodeJS Quality Gate covers typecheck, lint, tests, build and Cloudflare dry-runs. |
| Fix production domain/API URLs | Completed; production config derives API URL from `swwiitch.com`. |
| Align production schema | Core operational tables exist; destructive expansion was not performed without an app requirement. |
| Fix RLS performance warnings | Duplicate webhook indexes removed; assertions passed. Low-traffic `unused_index` informational items retained. |
| Keep payment secrets in hosting env | Documented and enforced by examples/runbooks; live values were not committed. |
| Upload real codes via Admin/Codes CSV | Flow exists and is admin-gated; manual end-to-end verification remains. |

## Supabase production changes

Project: `slnjgmwckknzwjcmlolj`.

### Applied migrations

1. `repair_admin_rls_and_webhook_indexes`
   - Granted authenticated execution of the hardened admin predicate.
   - Restricted admin policies from `PUBLIC` to `authenticated`.
   - Removed six webhook indexes duplicated by primary/unique keys.

2. `harden_admin_predicate_api_surface`
   - Moved the SECURITY DEFINER implementation to `private.is_admin()`.
   - Replaced `public.is_admin()` with a SECURITY INVOKER compatibility wrapper.
   - Preserved existing RLS and server RPC behavior.

3. `document_server_only_rls`
   - Added explicit deny policies for `contact_messages` and `rate_limits` to `anon` and `authenticated`.
   - Preserved service-role-only server access.

### Assertions

- `supabase/tests/unified_release_rls.sql`: passed.
- `supabase/tests/admin_predicate_api_surface.sql`: passed after correcting a test assumption about how PostgreSQL prints the default SECURITY INVOKER mode.
- `supabase/tests/server_only_rls.sql`: passed.

### Advisor result

- Duplicate-index warning: cleared.
- RLS-enabled-with-no-policy information for server-only tables: cleared.
- `unused_index` information remains and was not treated as a deletion instruction because the project lacks sufficient production usage history.
- Public catalog/banner GraphQL visibility is intentional.
- Authenticated table visibility is guarded by RLS and required by current application flows.
- The admin predicate SECURITY DEFINER warning is accepted and documented: the function is parameterless, depends on `auth.uid()`, returns only a Boolean, and is required by RLS.
- Supabase leaked-password protection remains a manual Auth setting and must be enabled before launch.

## CI and Cloudflare validation

NodeJS Quality Gate run #245 passed on `1df8caf3a2b414d4654da647738049276d04204a`:

- `npm ci`: passed.
- TypeScript typecheck: passed.
- ESLint: passed.
- Vitest tests: passed.
- Production build: passed.
- Cloudflare production deployment bundle dry-run: passed.
- Cloudflare preview version bundle dry-run: passed.

The repository still receives obsolete Vercel failure/pending statuses from a blocked or disconnected account. These checks are non-authoritative because Cloudflare is the selected deployment platform, but the integration should still be removed to eliminate misleading status noise.

## Digital-code handling

- `/admin/codes` accepts CSV with `product_slug,code,expires_at,status`.
- Import requires authenticated staff authorization.
- Import results are recorded in `audit_logs`.
- Real codes must never be committed.
- `code_ciphertext` is a legacy column name and must not be assumed to provide cryptographic at-rest protection; values remain highly sensitive.

## Supporting repositories

### R2 Explorer

- Repository: `503badrr/r2-explorer-template`.
- PR #2: draft, mergeable, head `52dfc38d9acc0d81433245c505853548be2bf085`.
- R2 Explorer Quality Gate run #2 passed.
- Blocking external work: Cloudflare Access, production/preview buckets, and anonymous denial verification.

### Cloudflare MCP

- Correct repository: `503badrr/mcp-server-cloudflare`.
- The user-supplied `mcp-server-cloudflareo` path was a typo and does not exist.
- Current main release commit: `0ffd90f581cb4c52e3dc0bd23c85136364517a46`.
- Quality release is merged but intentionally non-deploying until Switch-owned resources and OAuth secrets exist.

### `Vbddr`

The connected GitHub installation returned no accessible repositories for owner `Vbddr`. No transfer, deletion, or modification action was taken.

## Remaining launch gates

- Manual mobile/desktop preview review, including 320px overflow.
- Enable leaked-password protection in Supabase Auth.
- Verify Tap production secrets and signed webhook behavior.
- Verify wrong signatures are rejected and webhook event IDs remain idempotent.
- Verify Admin/Codes CSV with non-production test codes.
- Verify Cloudflare deployment completion, DNS, and SSL for both official domains.
- Remove/disable the obsolete Vercel GitHub integration.
- Complete R2 and MCP external provisioning independently.

## Decision

PR #32 and the database hardening are merged/applied and technically verified. Do not label the platform fully launch-ready until every remaining manual or external gate is completed or explicitly accepted by the release owner with evidence. Issue #3 remains open as the authoritative launch checklist.
