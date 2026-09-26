# Shopify Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the merged Shopify Headless integration production-safe on the existing Switch Cloudflare Worker without creating a second deployment target.

**Architecture:** Keep browser-safe Storefront API reads/cart mutations on Shopify's public Storefront token and keep any private Storefront token server-only inside the existing TanStack Start/Cloudflare Worker. Pin the Storefront API to the current stable `2026-07` schema, harden the private route, and add regression checks for the deployment contract.

**Tech Stack:** React 19, TypeScript, TanStack Start, Vite 8, Vitest, Nitro `cloudflare-module`, Cloudflare Workers/Wrangler, Shopify Storefront GraphQL API.

**Spec:** `docs/SHOPIFY_INTEGRATION.md`

## Global Constraints

- Work only in `503badrr/cosmic-switch-preview`; do not create a new project.
- Production remains the Cloudflare Worker `dark-disk-4155`.
- Canonical production host is `https://swwiitch.com`; `www.swwiitch.com` stays routed to the same Worker.
- Do not expose `PRIVATE_STOREFRONT_API_TOKEN` or any backend secret to client bundles.
- Do not reintroduce Vercel or a standalone Shopify Worker.
- Use Shopify Storefront API `2026-07` until the next deliberate quarterly upgrade.

---

### Task 1: Add Shopify production regression tests

**Files:**
- Create: `src/lib/shopify/production-readiness.test.ts`

**Interfaces:**
- Consumes: repository source files and Shopify query constants.
- Produces: Vitest assertions that fail on retired API versions, invalid private-token headers, invalid client env prefixes, removed Shopify fields, and invalid customer query arguments.

- [ ] **Step 1: Write failing tests** that assert `VITE_SHOPIFY_*` client variables, API `2026-07`, `Shopify-Storefront-Private-Token`, `availableForSale`, and `customerAccessToken`.
- [ ] **Step 2: Run `npm run test -- src/lib/shopify/production-readiness.test.ts`** and verify failures are caused by the current integration.
- [ ] **Step 3: Commit the failing tests** as a separate red-state commit.

### Task 2: Correct Shopify client/server API contract

**Files:**
- Modify: `src/lib/shopify/client.ts`
- Modify: `src/lib/shopify/queries.ts`
- Modify: `src/server/shopify.server.ts`

**Interfaces:**
- Consumes: `VITE_SHOPIFY_STORE_DOMAIN`, `VITE_SHOPIFY_STOREFRONT_API_TOKEN`, optional `VITE_SHOPIFY_STOREFRONT_API_VERSION`, `SHOPIFY_STORE_DOMAIN`, optional `SHOPIFY_STOREFRONT_API_VERSION`, and `PRIVATE_STOREFRONT_API_TOKEN`.
- Produces: Storefront requests compatible with `2026-07`, preserving the local `available` TypeScript shape through GraphQL aliases.

- [ ] **Step 1: Replace client `PUBLIC_*` Vite lookups with `VITE_SHOPIFY_*` lookups** and default the version to `2026-07`.
- [ ] **Step 2: Make the server use the private Storefront header** `Shopify-Storefront-Private-Token` and the same pinned API version.
- [ ] **Step 3: Preserve buyer IP when present** using `Shopify-Storefront-Buyer-IP` for server-side buyer traffic.
- [ ] **Step 4: Replace removed `ProductVariant.available` selections with `available: availableForSale`**.
- [ ] **Step 5: Correct the customer orders query to require `customerAccessToken`** instead of an ID.
- [ ] **Step 6: Run the focused test, then `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`**.

### Task 3: Align deployment examples and CI

**Files:**
- Modify: `.env.example`
- Modify: `.env.production.example`
- Modify: `.github/workflows/webpack.yml`
- Modify: `docs/SHOPIFY_INTEGRATION.md`

**Interfaces:**
- Consumes: the environment names implemented by Task 2.
- Produces: one documented Cloudflare deployment contract and build-time test values that never contain private secrets.

- [ ] **Step 1: Document build-time `VITE_SHOPIFY_*` public values and server-only Shopify runtime values**.
- [ ] **Step 2: Add non-secret Shopify placeholders to the GitHub quality-gate build environment** so bundle creation exercises the client path.
- [ ] **Step 3: Remove obsolete `SHOPIFY_WORKER_URL`/`ALLOWED_ORIGINS` documentation** from the single-Worker architecture.
- [ ] **Step 4: Re-run the complete quality gate and Wrangler dry-runs**.

### Task 4: Review and release gate

**Files:**
- No production files unless review identifies a defect.

**Interfaces:**
- Consumes: completed diff and CI/deployment results.
- Produces: review-ready PR with explicit remaining external configuration.

- [ ] **Step 1: Run CodeRabbit review against `main`** and address any critical/major issues before merge.
- [ ] **Step 2: Confirm Cloudflare Worker preview succeeds** and verify the duplicate Pages project is not treated as the production target.
- [ ] **Step 3: Confirm production still requires Cloudflare build/runtime values for Shopify tokens**; do not hard-code real tokens in Git.
- [ ] **Step 4: Merge only after the release gate is green or the only blocker is an explicitly documented external account/billing setting.**
