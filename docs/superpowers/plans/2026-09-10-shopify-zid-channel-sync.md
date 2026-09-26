# Shopify + Zid Channel Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing Shopify Storefront integration and add a server-only Zid channel adapter with safe product synchronization and authenticated order webhooks.

**Architecture:** Shopify remains the commerce source of truth for the Switch storefront. Zid is a secondary channel accessed only from server code on Cloudflare; synchronization is keyed by SKU and live writes are disabled unless explicitly enabled.

**Tech Stack:** TypeScript, TanStack Start, Vite, Vitest, Cloudflare Workers, Shopify Storefront API 2026-07, Zid Merchant API v1.

**Spec:** `docs/superpowers/specs/2026-09-10-shopify-zid-channel-sync-design.md`

## Global Constraints
- Production storefront remains `swwiitch.com` on the existing Cloudflare Worker.
- Shopify Storefront API version is exactly `2026-07`.
- Zid base URI is exactly `https://api.zid.sa/v1`.
- Private Shopify and Zid credentials are server-only and never use `VITE_` prefixes.
- Zid writes require `ZID_SYNC_WRITES_ENABLED=1`.
- Product correlation uses exact non-empty SKU.
- No digital code fulfillment is triggered by the first webhook implementation.

---

### Task 1: Shopify Storefront schema hardening

**Files:**
- Modify: `src/lib/shopify/queries.ts`
- Modify: `src/lib/shopify/production-readiness.test.ts`

**Interfaces:**
- Produces Storefront GraphQL documents valid for API 2026-07.

- [ ] Add failing regression assertions that variant lookup uses `node(id:)`, `GET_SHOP_INFO_QUERY` omits `currencyCode`, order line items omit unsupported `id`, and cart cost omits deprecated tax/duty fields.
- [ ] Validate the currently failing GraphQL documents against Shopify Storefront 2026-07.
- [ ] Replace variant lookup with `node(id:) { ... on ProductVariant }`; remove invalid/deprecated fields.
- [ ] Revalidate all changed Shopify GraphQL documents.
- [ ] Commit the Shopify schema hardening.

### Task 2: Zid server client and deterministic product mapping

**Files:**
- Create: `src/server/zid/types.ts`
- Create: `src/server/zid/client.server.ts`
- Create: `src/server/zid/client.server.test.ts`
- Modify: `.env.example`
- Modify: `.env.production.example`

**Interfaces:**
- Produces `getZidConfig()`, `buildZidManagerHeaders()`, `mapShopifyProductToZid()`, `listZidProducts()`, `createZidProduct()`, and `updateZidProduct()`.

- [ ] Write tests for missing credentials, server header construction, URL normalization, SKU requirement, digital product-class mapping, and write-gate behavior.
- [ ] Implement the smallest server-only Zid client that passes those contracts using native `fetch` and existing `zod`.
- [ ] Add documented runtime environment names without values or secrets.
- [ ] Commit the Zid client and tests.

### Task 3: Zid authenticated webhook ingress

**Files:**
- Create: `src/server/zid/webhook.server.ts`
- Create: `src/server/zid/webhook.server.test.ts`
- Create: `src/routes/api/zid/webhooks.ts`

**Interfaces:**
- Produces `handleZidWebhook(request: Request): Promise<Response>`.

- [ ] Write tests for Basic auth rejection, supported-event allowlist, malformed JSON, event normalization, and deterministic idempotency key generation.
- [ ] Implement constant-time credential comparison and strict body-size/content-type checks.
- [ ] Implement route wiring that delegates POST requests to `handleZidWebhook`.
- [ ] Keep fulfillment side effects absent; acknowledge normalized events only.
- [ ] Commit webhook ingress.

### Task 4: Live-read readiness checks and release controls

**Files:**
- Create: `src/server/zid/readiness.server.ts`
- Create: `src/server/zid/readiness.server.test.ts`
- Modify: `docs/MCP_INFRA_SETUP.md` if necessary to distinguish developer MCP from production Zid API credentials.

**Interfaces:**
- Produces `checkZidReadiness()` returning an explicit configured/authorized status without exposing tokens.

- [ ] Write tests that readiness never returns secret values and fails closed when runtime credentials are absent.
- [ ] Implement a read-only `GET /products/?page=1&page_size=1` connectivity probe.
- [ ] Ensure product writes are never part of readiness.
- [ ] Commit readiness checks.

### Task 5: Verification, PR, and merge gate

**Files:**
- Review all files changed in Tasks 1-4.

**Interfaces:**
- Produces a mergeable PR only when branch verification is satisfactory.

- [ ] Run Shopify schema validation for every changed Storefront operation.
- [ ] Run GitHub quality workflow and inspect job steps/logs.
- [ ] If CI infrastructure still fails before a runner starts, do not represent tests as passed; document the blocker.
- [ ] Perform Zid live read probe only when valid Zid runtime credentials are available through an authorized integration; never invent credentials.
- [ ] Open PR against latest `main`, inspect mergeability and status checks, and merge only after executable verification passes.
