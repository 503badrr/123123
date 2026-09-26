# Switch Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the current GitHub/Lovable-synchronized Switch codebase and its production runbooks to an auditable launch-candidate state without changing payment semantics, DNS, or destructive customer data.

**Architecture:** GitHub `main` is the canonical source and Cloudflare Worker `dark-disk-4155` is the deployment target. Supabase remains the production database/auth provider, while Tap remains the hosted checkout default. Changes are split into documentation, backward-compatible database hardening, release evidence, and issue tracking.

**Tech Stack:** TanStack Start, React 19, TypeScript, Vite, Cloudflare Workers, Supabase/PostgreSQL, GitHub Actions.

## Global Constraints

- Final domain is `swwiitch.com` and `www.swwiitch.com`.
- Do not commit service-role, Tap secret, live digital codes, or other secrets.
- Do not change payment success semantics or deliver codes before verified webhook processing.
- Do not drop production business indexes merely because the advisor reports low usage.
- All database changes must be backward-compatible and asserted after application.
- R2 Explorer and Cloudflare MCP remain separate components with independent launch gates.

---

### Task 1: Confirm canonical source and baseline

**Files:**
- Modify: `docs/audits/2026-08-03-production-readiness.md`

- [x] Verify Lovable project `Switch` is synchronized with GitHub main commit `fe63822f1061f2977c3157a9a3f386e40ade3538`.
- [x] Verify `.env.example`, `.env.production.example`, deployment guide, and NodeJS Quality Gate exist.
- [x] Verify the final deployment domain is `swwiitch.com`.

### Task 2: Apply existing Supabase RLS/index repair

**Files:**
- Existing: `supabase/migrations/20260801205033_repair_admin_rls_and_webhook_indexes.sql`
- Existing test: `supabase/tests/unified_release_rls.sql`

- [x] Inspect production policies, function grants, and webhook indexes.
- [x] Apply the existing non-destructive migration to production.
- [x] Run the SQL assertion script in a rollback transaction.
- [x] Re-run Supabase advisors and confirm duplicate-index warning is removed.

### Task 3: Add backward-compatible admin predicate hardening

**Files:**
- Create: `supabase/migrations/20260803130000_harden_admin_predicate_api_surface.sql`
- Create: `supabase/tests/admin_predicate_api_surface.sql`

- [x] Create `private.is_admin()` as the SECURITY DEFINER implementation.
- [x] Replace `public.is_admin()` with a SECURITY INVOKER compatibility wrapper.
- [x] Preserve authenticated and service-role behavior while keeping anon/public denied.
- [x] Apply the migration and run assertions.
- [x] Re-run the security advisor and document the intentional remaining finding.

### Task 4: Add security and operations runbooks

**Files:**
- Create: `README_SECURITY.md`
- Create: `README_OPERATIONS.md`
- Modify: `README_DEPLOYMENT.md`

- [x] Document secrets, RLS, webhook verification, digital-code handling, key rotation, and incident response.
- [x] Document deploy, rollback, health checks, observability, backups, and release ownership.
- [x] Link the runbooks from the deployment guide.

### Task 5: Refresh release evidence

**Files:**
- Create: `release/archive/switch-unified-2026-08-01.json`
- Delete: `release/switch-unified-2026-08-01.json`
- Create: `release/switch-unified-2026-08-03.json`
- Create: `docs/audits/2026-08-03-production-readiness.md`

- [x] Archive the stale 1 August candidate manifest.
- [x] Record current storefront, R2, MCP, Supabase, CI, and Cloudflare status.
- [x] Keep external/manual gates explicit rather than claiming launch readiness.

### Task 6: Verify and integrate

**Files:**
- Modify: `.github/workflows/webpack.yml`.
- Update: GitHub Issue #3.

- [x] Run NodeJS Quality Gate on the branch.
- [x] Confirm typecheck, lint, tests, build, and Cloudflare dry-runs in run #243.
- [x] Open PR #32 with exact completed and deferred gates.
- [x] Reopen and update Issue #3 to reflect the current state and remaining external actions.
