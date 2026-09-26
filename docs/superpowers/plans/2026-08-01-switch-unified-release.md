# Switch Unified Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one reviewable, pinned release candidate across the storefront, private R2 explorer, and Cloudflare MCP repositories without merging, deploying, changing DNS, or mutating the production database.

**Architecture:** The storefront remains the release coordinator and owns checkout, Tap, Supabase migrations, and a manifest pinning the three component commits. The R2 explorer remains a read-only operational surface protected at the Cloudflare Access route. The first MCP surface is the Workers Observability app; the monorepo quality gates must still pass.

**Tech Stack:** TanStack Start, React 19, TypeScript, Vitest, Supabase/Postgres, Tap Payments V2, Cloudflare Workers/R2/Access, pnpm/Turborepo, GitHub Actions.

## Global Constraints

- Work only on `release/switch-unified-2026-08-01`.
- Never merge to `main`, deploy, change DNS, create paid infrastructure, or execute DDL against production.
- Keep Tap and Supabase secrets server-only.
- Do not change managed `auth`, `storage`, or `extensions` ownership/privileges to silence expected permission errors.
- Do not apply the destructive `order_items` rewrite supplied in the audit notes.
- Preserve intentional anonymous product and banner reads.
- Every task ends with the narrowest relevant verification before its commit.

---

## Task 1: Storefront CI and environment contract

**Files:**
- Modify: `.github/workflows/webpack.yml`
- Modify: `.env.example`
- Modify: `.env.production.example`

- [ ] Make the quality gate run for the unified release branch and use `npm ci`.
- [ ] Align both environment templates on Tap as the default provider.
- [ ] Remove the unused `TAP_WEBHOOK_SECRET` contract and document `TAP_SOURCE_ID`.
- [ ] Verify the YAML and environment variable names by inspection and repository search.

## Task 2: Harden Tap charge creation and webhook verification

**Files:**
- Modify: `src/server/payments/tap.server.ts`
- Create: `src/server/payments/tap.server.test.ts`

- [ ] Add tests for a valid `hashstring`, an invalid signature, 3-decimal currency formatting, customer normalization, and hosted charge payload construction.
- [ ] Normalize Saudi phone/name data before sending it to Tap.
- [ ] Send explicit 3DS, non-saving, references, redirect/post URLs, statement descriptor, and configurable source fields.
- [ ] Reject malformed Tap create responses and normalize status.
- [ ] Run the Tap test file, then `npm run ci`.

## Task 3: Add a corrective Supabase migration and assertions

**Files:**
- Create: `supabase/migrations/<cli-generated>_repair_admin_rls_and_webhook_indexes.sql`
- Create: `supabase/tests/unified_release_rls.sql`

- [ ] Generate the migration filename with `supabase migration new`.
- [ ] Grant `authenticated` execution on `public.is_admin()` while keeping `public` and `anon` revoked.
- [ ] Scope every policy that calls `is_admin()` to `authenticated`.
- [ ] Drop only the six proven redundant webhook indexes; retain the primary key, unique provider event constraint, and processed index.
- [ ] Add read-only catalog assertions for function ACLs, policy roles, and duplicate indexes.
- [ ] Lint the SQL locally; do not apply it to production.

## Task 4: Keep the R2 explorer private and preview-safe

**Files:**
- Modify: `src/index.ts`
- Modify: `wrangler.json`
- Modify: `README.md`
- Create: `.github/workflows/quality.yml`

- [ ] Preserve `readonly: true` and make the Cloudflare Access route requirement explicit.
- [ ] Separate preview and production worker/bucket configuration without embedding credentials.
- [ ] Add CI for install, TypeScript, and Wrangler dry-run.
- [ ] Run `npx tsc --noEmit` and `wrangler deploy --dry-run`.

## Task 5: Repair and focus the MCP release surface

**Files:**
- Modify: `packages/mcp-observability/package.json`
- Create: `docs/switch-unified-release.md`
- Create: `.github/workflows/switch-unified-quality.yml`

- [ ] Replace the library package's invalid `wrangler types` script with its TypeScript check.
- [ ] Designate `apps/workers-observability` as the only first-release application.
- [ ] Add a non-deploying quality workflow for dependency rules, format, tests, types, and the selected app.
- [ ] Run `pnpm check:deps`, `pnpm check:format`, `pnpm test:ci`, and `pnpm types`.

## Task 6: Pin the unified release and verify the aggregate diff

**Files:**
- Create: `release/switch-unified-2026-08-01.json`
- Create: `docs/runbooks/switch-unified-release.md`

- [ ] Pin immutable component commit SHAs and record required manual configuration.
- [ ] Document ordered staging checks for Supabase migration, Tap sandbox, Cloudflare Access, R2 preview, and MCP OAuth.
- [ ] Compare each release branch to `main` and review every changed file.
- [ ] Re-run all available local/branch checks and record any external blockers.
- [ ] Stop with the three release branches ready for human review; do not merge or deploy.
