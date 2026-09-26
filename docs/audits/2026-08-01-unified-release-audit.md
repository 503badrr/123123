# Switch Unified Release Audit

**Audit date:** 2026-08-01  
**Branch:** `release/switch-unified-2026-08-01`  
**Mode:** read-only project inspection; no production SQL, deployment, DNS, merge, or PR action was performed.

## Executive status

The three release branches exist. The storefront has a solid payment/webhook foundation, but the unified release is not ready for production promotion. The primary blockers are Supabase authorization drift, Git/database migration drift, stale deployment configuration, unsecured R2 operational access, and an MCP monorepo type-pipeline failure.

## Evidence

| Area | Evidence | Status |
|---|---|---|
| Git branches | `release/switch-unified-2026-08-01` created from `main` in all three repositories | Created |
| Storefront CI | Main SHA `8d6961d` has no pull-request workflow run; Vercel status is blocked/failing | Blocked |
| PR 27 | SHA `0dca6ee`; NodeJS Quality Gate run 198 succeeded; PR is mergeable | Candidate source |
| PR 28 | SHA `7728a28`; NodeJS Quality Gate run 147 and Vercel succeeded; PR is currently not mergeable | Needs reconciliation |
| Supabase | Project `switch-production` is `ACTIVE_HEALTHY`, Postgres 17.6 | Healthy service |
| Public tables | All listed public tables have RLS enabled | Positive |
| Admin authorization | `public.is_admin()` ACL grants only `postgres` and `service_role`, while UI and policies call it as authenticated users | Critical drift |
| Policy targeting | Multiple policies using `is_admin()` target `PUBLIC` instead of explicit `authenticated` | High |
| Migration history | Production lists security migrations through `20260729084337`; matching migration source is absent from current `main` search | Critical drift |
| Order items | Required relational columns and foreign keys remain present | Preserve |
| Webhook indexes | Five duplicate ID indexes plus redundant provider/event index exist beside PK/unique constraint | Cleanup required |
| Security advisor | Leaked-password protection disabled | High |
| GraphQL advisor | Public products/banners and several authenticated tables are discoverable | Review by product intent |
| Tap HMAC | SHA-256 HMAC, currency decimal formatting, and constant-time comparison implemented | Positive |
| Tap request | Generic customer object sent directly; `src_all` hard-coded; explicit 3DS/save-card/language contract absent | High |
| Fulfilment | Atomic RPC, replay guard, row locks, amount/currency checks, and service-role-only execution are present | Positive |
| Digital codes | `code_ciphertext` is selected and returned as `code` without demonstrated encryption | Critical confidentiality risk |
| Storefront workflow | Uses `npm install`, despite lockfile/reproducibility requirement; only main pushes and PRs trigger the gate | High |
| Env examples | Production example still references Lovable, defaults to Moyasar, and diverges from `.env.example` | High |
| R2 Explorer | TypeScript passed; Wrangler dry-run completed with 61 assets, 484.94 KiB upload; sandbox log path emitted an environment-only warning | Baseline passes |
| R2 security | Placeholder Worker/bucket names, same preview/production bucket, Cloudflare Access unset, read-only mode on | Not deployable |
| MCP dependencies | Syncpack: 26 exact package versions and 378 dependency rules valid | Pass |
| MCP tests | 11 files and 119 tests passed | Pass |
| MCP formatting | Prettier exited successfully but emitted a Babel import-sorting parse error | Investigate |
| MCP types | Failed in `@repo/mcp-observability`: `wrangler types` has no Wrangler config | Release blocker |
| Superdesign | CLI available, but authentication could not be stored because the default config directory is not writable | Design generation blocked |

## Prioritized remediation

### P0 — before any production migration or payment cutover

1. Restore authenticated execution of `public.is_admin()` with least privilege and recreate dependent policies with explicit roles.
2. Reconcile PR 27 migration source with the migration history already applied to production; add a new corrective migration for current drift.
3. Protect digital codes as actual encrypted secrets or strictly service-only sensitive plaintext with audited reveal.
4. Keep the destructive `order_items` SQL out of the release.
5. Add Tap request/response and webhook fixtures before selecting Tap as active production provider.

### P1 — before unified staging

1. Replace R2 placeholders, separate buckets, and configure Cloudflare Access while keeping read-only mode.
2. Select one MCP application and repair the root type command.
3. Replace `npm install` with `npm ci` in CI and make the full `npm run ci` gate authoritative.
4. Reconcile PR 27 and PR 28 rather than merging both blindly.
5. Consolidate environment examples and remove obsolete Lovable/provider defaults.

### P2 — before production promotion

1. Enable Supabase leaked-password protection.
2. Add the unified three-SHA manifest and staged release workflow.
3. Add the private infrastructure status page after Superdesign authentication and repository initialization are available.
4. Run an isolated Supabase branch test and one-SAR Tap sandbox end-to-end scenario.
5. Capture rollback SHAs, deployment URLs, DNS state, and advisor output.

## SQL decisions

Do not grant `authenticated` access to `auth.audit_log_entries`, `storage.vector_indexes`, `extensions.pg_stat_statements_info`, or `hypopg_hidden_indexes`. The observed permission errors on these managed/internal objects are expected.

Do not enable or alter RLS on Supabase-managed `auth` tables as part of this release. Do not add duplicate standalone auth indexes without a verified query plan and ownership support.

The duplicate webhook cleanup keeps:

- `webhook_events_pkey`
- `webhook_events_provider_event_id_key`
- `idx_webhook_events_processed`

and removes only the redundant indexes listed in the design specification.

## Advisor references

- [Supabase RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Supabase GraphQL anonymous exposure](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed)
- [Supabase GraphQL authenticated exposure](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed)
- [Supabase leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Supabase duplicate-index advisor](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index)
