# Switch Phase 1 Product Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Switch from a partially demo-driven storefront into a truthful production commerce foundation with real product management, protected internal sourcing metadata, real owner KPIs, secure digital inventory, and an auth path ready for Cloudflare Turnstile.

**Architecture:** Keep the current TanStack Start + Cloudflare Worker storefront and progressively replace demo data with server-backed Supabase data. Extend the production schema additively; keep customer-visible catalog fields in `products`, move sourcing/cost data into RLS-protected internal tables, enforce sellability server-side in checkout, and expose owner/admin operations through authenticated server functions. Every risky change is isolated on a feature branch and validated through the existing NodeJS Quality Gate plus Supabase assertions.

**Tech Stack:** React 19, TanStack Start/Router/Query, TypeScript 5.8, Supabase Postgres/Auth/RLS, Vitest 4, Cloudflare Workers/Wrangler 4.118, Recharts, Zod.

## Global Constraints

- GitHub `main` remains the source of truth; never implement directly on `main`.
- Production deploy target remains only Cloudflare Worker `dark-disk-4155`.
- Supabase production project remains `switch-production` (`slnjgmwckknzwjcmlolj`).
- No service-role key or provider secret is shipped to browser code.
- Supplier names, supplier SKUs, acquisition cost, and internal margin metadata are never exposed by public product queries.
- Existing 19 products are preserved initially; no destructive catalog reset.
- Demo financial/KPI values must not remain on production admin paths.
- Order/payment state is server-controlled; browser return pages never prove payment success.
- Digital-code assignment remains transactional and concurrency-safe.
- All new tables use RLS and least-privilege grants.
- Existing storefront visual language and routes are preserved unless a change is required for truthful data or security.
- Full accounting `net profit` is not claimed unless operating expenses are sourced; use gross profit/margin when cost is complete.

---

## File Structure

### New files

- `supabase/migrations/20260816070000_switch_phase1_product_engine.sql` — additive product lifecycle, sourcing tables, sellability function, indexes, RLS, and checkout hardening.
- `supabase/tests/product_engine_rls.sql` — SQL assertions for public/private catalog access, grants, and product-source isolation.
- `src/lib/product-rules.ts` — pure product validation/sellability helpers used by admin UI and tests.
- `src/lib/product-rules.test.ts` — unit tests for lifecycle, price, source/inventory requirements, and customer-safe projections.
- `src/lib/admin-dashboard.ts` — pure aggregation/formatting helpers for owner dashboard data.
- `src/lib/admin-dashboard.test.ts` — zero-state and seeded aggregation tests.
- `src/routes/admin.products.tsx` — product-management UI.
- `src/components/admin/AdminMetricCard.tsx` — reusable accessible metric card.
- `src/components/auth/TurnstileGate.tsx` — optional Turnstile widget rendered only when a public site key exists.
- `src/lib/auth-captcha.ts` — helper to require/pass/reset CAPTCHA tokens without duplicating logic.
- `src/lib/auth-captcha.test.ts` — CAPTCHA token policy tests.
- `src/lib/security-regressions.test.ts` — static regression checks for Vercel fallbacks, tracked `.env` assumptions, and demo admin imports.

### Modified files

- `src/integrations/supabase/types.ts` — generated-equivalent types for new schema until the next CLI regeneration.
- `src/lib/products.functions.ts` — public catalog reads use customer-safe fields and sellability state.
- `src/lib/checkout.functions.ts` — remove Vercel fallbacks and rely on hardened DB sellability validation.
- `src/lib/admin.functions.ts` — split/extend product CRUD, dashboard, finance, security, inventory summaries and strict owner/admin guards.
- `src/routes/admin.owner.tsx` — use real overview data and honest zero states.
- `src/routes/admin.analytics.tsx` — use real order/category/product aggregates only; no fabricated web analytics.
- `src/routes/admin.finance.tsx` — use real payments/order cost aggregates and accurate labels.
- `src/routes/admin.staff.tsx` — use real queue counts/orders; processing action remains disabled until a safe state-transition endpoint exists.
- `src/routes/admin.security.tsx` — use real audit/webhook data and explicit security-check statuses rather than fake IP/session counts.
- `src/routes/admin.integrations.tsx` — use real provider configuration status; remove fake future integrations from operational status cards.
- `src/routes/admin.codes.tsx` — safer list/search and import result reporting.
- `src/components/AdminLayout.tsx` — add Products route, improve navigation grouping/status, preserve mobile accessibility.
- `src/routes/auth.tsx` — pass Turnstile CAPTCHA token to password sign-in/sign-up when configured.
- `src/routes/reset-password.tsx` — pass CAPTCHA token for reset requests when configured.
- `package.json` / `package-lock.json` — add `@marsidev/react-turnstile` only if required by final implementation.
- `.gitignore` — ensure `.env` remains ignored.
- `.env.example`, `.env.production.example`, `.dev.vars.example` — document only public Turnstile site key and required server secrets by name, never values.
- `README_SECURITY.md` — document Turnstile activation, product-source isolation, and remaining manual Supabase Auth toggle.
- `README_OPERATIONS.md` — catalog review/activation and inventory runbook.

---

### Task 1: Security Baseline and Regression Tests

**Files:**
- Create: `src/lib/security-regressions.test.ts`
- Modify: `.gitignore`
- Delete from feature branch: `.env`
- Modify: `src/lib/checkout.functions.ts`

**Interfaces:**
- Consumes: repository files only.
- Produces: CI-enforced guarantees that production checkout cannot fall back to Vercel and sensitive `.env` is not expected to be committed.

- [ ] **Step 1: Write failing static regression tests**

```ts
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, test } from "vitest";

const checkout = readFileSync("src/lib/checkout.functions.ts", "utf8");
const gitignore = readFileSync(".gitignore", "utf8");

describe("production security regressions", () => {
  test("checkout has no Vercel production URL fallback", () => {
    expect(checkout).not.toContain("VERCEL_PROJECT_PRODUCTION_URL");
    expect(checkout).not.toContain("VERCEL_URL");
  });

  test("local environment files are ignored", () => {
    expect(gitignore).toMatch(/(^|\n)\.env($|\n)/);
    expect(gitignore).toContain(".env.*");
  });

  test("tracked working tree does not require a root .env", () => {
    expect(existsSync(".env")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `npm run test -- src/lib/security-regressions.test.ts`

Expected: FAIL because current checkout still references Vercel fallbacks and the repository currently contains `.env`.

- [ ] **Step 3: Apply the minimal fixes**

Change `getSiteUrl()` fallback order to exactly:

```ts
const configuredUrl =
  process.env.PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  process.env.APP_URL ??
  "https://swwiitch.com";
```

Delete tracked `.env` from the feature branch. Ensure `.gitignore` contains:

```gitignore
.env
.env.*
!.env.example
!.env.production.example
```

- [ ] **Step 4: Run targeted test and full quality gate**

Run: `npm run test -- src/lib/security-regressions.test.ts`
Expected: PASS.

Run: `npm run typecheck && npm run lint`
Expected: PASS/no errors.

- [ ] **Step 5: Commit**

Commit: `fix(security): remove local env tracking and Vercel fallback`

---

### Task 2: Product Engine Schema, Internal Sources, and RLS

**Files:**
- Create: `supabase/tests/product_engine_rls.sql`
- Create: `supabase/migrations/20260816070000_switch_phase1_product_engine.sql`
- Modify: `src/integrations/supabase/types.ts`

**Interfaces:**
- Produces tables `public.suppliers`, `public.product_sources`; product columns `sku`, `fulfillment_type`, `lifecycle_status`, `reviewed_at`, `low_stock_threshold`, `block_reason`; function `public.product_is_sellable(uuid)`; hardened `public.create_checkout_order(...)`.
- Consumers: Tasks 3-7.

- [ ] **Step 1: Verify RED against production metadata before migration**

Run the read-only query:

```sql
select
  exists(select 1 from information_schema.tables where table_schema='public' and table_name='suppliers') as has_suppliers,
  exists(select 1 from information_schema.tables where table_schema='public' and table_name='product_sources') as has_product_sources,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='fulfillment_type') as has_fulfillment_type;
```

Expected: all `false`.

- [ ] **Step 2: Write SQL assertions first**

`supabase/tests/product_engine_rls.sql` must assert:

```sql
begin;

-- Required schema exists.
do $$ begin
  if to_regclass('public.suppliers') is null then raise exception 'suppliers missing'; end if;
  if to_regclass('public.product_sources') is null then raise exception 'product_sources missing'; end if;
end $$;

-- Browser roles cannot read sourcing tables.
do $$ begin
  if has_table_privilege('anon', 'public.product_sources', 'SELECT') then raise exception 'anon can read sources'; end if;
  if has_table_privilege('authenticated', 'public.product_sources', 'SELECT') then raise exception 'authenticated can directly read sources'; end if;
end $$;

-- Public product rows require reviewed lifecycle for sellability.
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='lifecycle_status'
  ) then raise exception 'lifecycle_status missing'; end if;
end $$;

rollback;
```

- [ ] **Step 3: Write additive migration**

The migration must:

1. Add product columns with non-destructive defaults:

```sql
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists fulfillment_type text not null default 'digital_code';
alter table public.products add column if not exists lifecycle_status text not null default 'needs_review';
alter table public.products add column if not exists reviewed_at timestamptz;
alter table public.products add column if not exists low_stock_threshold integer not null default 5;
alter table public.products add column if not exists block_reason text;

update public.products set sku = upper('SW-' || replace(slug, '-', '_')) where sku is null;

alter table public.products alter column sku set not null;
create unique index if not exists products_sku_key on public.products(sku);

alter table public.products drop constraint if exists products_fulfillment_type_check;
alter table public.products add constraint products_fulfillment_type_check
  check (fulfillment_type in ('digital_code','manual','service','physical'));

alter table public.products drop constraint if exists products_lifecycle_status_check;
alter table public.products add constraint products_lifecycle_status_check
  check (lifecycle_status in ('needs_review','approved','blocked','retired'));

alter table public.products drop constraint if exists products_low_stock_threshold_check;
alter table public.products add constraint products_low_stock_threshold_check
  check (low_stock_threshold >= 0 and low_stock_threshold <= 1000000);
```

2. Create internal source tables:

```sql
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name_internal text not null unique,
  status text not null default 'active' check (status in ('active','paused','disabled')),
  integration_type text not null default 'manual' check (integration_type in ('manual','api','csv')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  supplier_sku text,
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  currency text not null default 'SAR',
  stock_status text not null default 'unknown' check (stock_status in ('unknown','in_stock','low_stock','out_of_stock')),
  priority integer not null default 100,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, supplier_id, supplier_sku)
);

create index if not exists product_sources_product_active_priority_idx
  on public.product_sources(product_id, is_active, priority);
```

3. Enable RLS, revoke browser grants, grant service role only for sourcing tables.

4. Create `public.product_is_sellable(p_product_id uuid)` as `security definer`, service-role/postgres-only executable. Its logic must require:
   - product active
   - `lifecycle_status='approved'`
   - price > 0
   - supported fulfillment type
   - for `digital_code`: enough unexpired available codes for at least one unit
   - for `manual/service/physical`: one active source with `stock_status <> 'out_of_stock'`
   - no `block_reason`

5. Replace `create_checkout_order` so each requested product is locked and must pass the same sellability rules. For digital-code items it must also verify available code count >= requested quantity before creating the order.

6. Add audit-log actions for product/source mutation paths later consumed by app server functions.

- [ ] **Step 4: Apply migration to production only after source review**

Use Supabase migration action with name `switch_phase1_product_engine`.

- [ ] **Step 5: Verify GREEN with schema and privilege queries**

Run the metadata query from Step 1; expected all `true`.

Run:

```sql
select
  has_table_privilege('anon','public.product_sources','SELECT') as anon_read_sources,
  has_table_privilege('authenticated','public.product_sources','SELECT') as auth_read_sources,
  has_table_privilege('service_role','public.product_sources','SELECT') as service_read_sources;
```

Expected: `false, false, true`.

- [ ] **Step 6: Update TypeScript database types and commit**

Commit: `feat(db): add protected product sourcing and sellability model`

---

### Task 3: Pure Product Rules and Public Catalog Safety

**Files:**
- Create: `src/lib/product-rules.test.ts`
- Create: `src/lib/product-rules.ts`
- Modify: `src/lib/products.functions.ts`

**Interfaces:**
- Produces `ProductLifecycle`, `FulfillmentType`, `AdminProductInputSchema`, `customerProductProjection()`.
- Public product API continues to return only customer-safe fields.

- [ ] **Step 1: Write failing unit tests**

Tests must cover:

```ts
expect(customerProductProjection(fullRow)).not.toHaveProperty("supplier_id");
expect(customerProductProjection(fullRow)).not.toHaveProperty("cost_price");
expect(customerProductProjection(fullRow)).not.toHaveProperty("supplier_sku");
expect(AdminProductInputSchema.safeParse({ price: -1, ...valid }).success).toBe(false);
expect(AdminProductInputSchema.safeParse({ fulfillment_type: "other", ...valid }).success).toBe(false);
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `npm run test -- src/lib/product-rules.test.ts`
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement minimal product rules**

Use Zod enums exactly:

```ts
export const FulfillmentTypeSchema = z.enum(["digital_code", "manual", "service", "physical"]);
export const ProductLifecycleSchema = z.enum(["needs_review", "approved", "blocked", "retired"]);
```

Validate slug, SKU, Arabic name, category, price, optional old price, region, low-stock threshold, active flag, lifecycle, and fulfillment type.

- [ ] **Step 4: Harden public product functions**

`listProducts`, `getProductBySlug`, and `getProductsByIds` must select only explicit safe columns and require:

```ts
.eq("is_active", true)
.eq("lifecycle_status", "approved")
```

Do not select any supplier/source table or cost field.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test -- src/lib/product-rules.test.ts`
Expected: PASS.

Commit: `feat(catalog): enforce reviewed customer-safe products`

---

### Task 4: Admin Product and Inventory Server Functions

**Files:**
- Modify: `src/lib/admin.functions.ts`
- Create: `src/lib/admin-product-service.test.ts`

**Interfaces:**
- Produces server functions `listAdminProducts`, `upsertAdminProduct`, `setProductLifecycle`, `listProductSources`, `upsertProductSource`, `getInventorySummary`.
- Requires authenticated staff; source mutation requires owner/admin rather than generic staff.

- [ ] **Step 1: Write failing tests for authorization and input contracts**

Use pure exported input schemas and role helper tests so the tests do not mock Supabase behavior. Required cases:

- customer role rejected for all admin product operations
- staff can read products/inventory but cannot read or edit acquisition cost/source details
- admin/owner can manage sources
- negative prices/costs rejected
- `approved` lifecycle cannot be set while `block_reason` is non-null

- [ ] **Step 2: Verify RED**

Run: `npm run test -- src/lib/admin-product-service.test.ts`
Expected: FAIL because schemas/helpers are absent.

- [ ] **Step 3: Refactor role checks**

Replace the single ambiguous `assertStaff` with explicit role retrieval from the current user profile and helpers:

```ts
type AdminRole = "owner" | "admin" | "staff";

function canManageSources(role: AdminRole) {
  return role === "owner" || role === "admin";
}
```

Database/service-role operations remain server-only.

- [ ] **Step 4: Implement product CRUD and audit logging**

Every product write inserts one audit log with `actor_id`, action (`product.create`, `product.update`, `product.lifecycle`), entity type/id, and non-secret metadata.

Every source write logs `product_source.create/update` but does not include secrets or redeemable codes.

- [ ] **Step 5: Improve CSV code import result**

Return:

```ts
{
  total: number;
  inserted: number;
  skipped: number;
  invalid: number;
  duplicates: number;
}
```

Never echo all imported codes in the response.

- [ ] **Step 6: Run tests and commit**

Commit: `feat(admin): add protected product and inventory operations`

---

### Task 5: Real Owner Dashboard, Analytics, Finance, Staff, Security, Integrations

**Files:**
- Create: `src/lib/admin-dashboard.test.ts`
- Create: `src/lib/admin-dashboard.ts`
- Modify: `src/lib/admin.functions.ts`
- Modify: `src/routes/admin.owner.tsx`
- Modify: `src/routes/admin.analytics.tsx`
- Modify: `src/routes/admin.finance.tsx`
- Modify: `src/routes/admin.staff.tsx`
- Modify: `src/routes/admin.security.tsx`
- Modify: `src/routes/admin.integrations.tsx`
- Modify or delete after imports are gone: `src/data/admin.ts`

**Interfaces:**
- Produces owner overview, seven-day revenue series, category sales, top products, finance summary, queue summary, real audit/webhook feed, provider status.

- [ ] **Step 1: Write RED aggregation tests**

Minimum cases:

```ts
test("empty commerce data returns zero KPIs", () => {
  expect(buildOwnerMetrics({ orders: [], payments: [], profiles: [], products: [], codes: [] })).toMatchObject({
    revenueToday: 0,
    paidOrdersToday: 0,
    averageOrderValue: 0,
    lowStockProducts: 0,
  });
});

test("refunded payment is not counted as paid revenue", () => { /* seeded rows */ });

test("gross profit is null when source cost coverage is incomplete", () => { /* seeded rows */ });
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- src/lib/admin-dashboard.test.ts`
Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement dashboard helpers and server queries**

Use explicit date boundaries in Asia/Riyadh for dashboard labels while storing/querying UTC timestamps.

Owner metrics must distinguish:
- paid revenue
- refunds
- paid order count
- average paid order value
- active product count
- low stock count
- gross profit only when source cost is present for sold items

Do not show fabricated visits, bounce rate, sessions, or conversion rate. If no first-party analytics source exists, show `غير مربوط` rather than a number.

- [ ] **Step 4: Replace every `src/data/admin` import**

All affected admin routes use TanStack Query + server functions, loading states, error states, and honest empty states.

- [ ] **Step 5: Add real product route to navigation**

`AdminLayout` adds `/admin/products` using `PackageSearch` or `Boxes` icon and groups operational links coherently.

- [ ] **Step 6: Delete `src/data/admin.ts` only after repository search proves no runtime imports remain**

- [ ] **Step 7: Run tests and commit**

Commit: `feat(console): replace demo metrics with production data`

---

### Task 6: Product Management UI

**Files:**
- Create: `src/routes/admin.products.tsx`
- Create: `src/components/admin/AdminMetricCard.tsx`
- Modify: `src/components/AdminLayout.tsx`

**Interfaces:**
- Consumes Task 4 admin functions.
- Produces responsive searchable product list/editor with lifecycle, price, stock, and source visibility according to role.

- [ ] **Step 1: Write component behavior test or route contract test first**

Required assertions:
- zero products shows an empty-state CTA, not sample products
- lifecycle badge differentiates `needs_review`, `approved`, `blocked`, `retired`
- cost/source controls render only for owner/admin data contract
- Save disabled while validation fails

- [ ] **Step 2: Verify RED**

Run targeted Vitest test; expected missing route/component failure.

- [ ] **Step 3: Implement responsive product list**

Include:
- search by name/SKU/slug
- filter category/lifecycle/active
- stock count/status
- price + comparison price
- explicit `جاهز للبيع` / `يحتاج مراجعة` status
- owner/admin cost/margin display only when available

- [ ] **Step 4: Implement create/edit form**

Use the exact schemas from Task 3. Confirmation is required for lifecycle changes to `retired` or `blocked`; normal text edits do not require confirmation.

- [ ] **Step 5: Validate mobile layout at 320px contract level and commit**

Commit: `feat(console): add production product management`

---

### Task 7: Cloudflare Turnstile-Ready Auth and Password Recovery

**Files:**
- Create: `src/lib/auth-captcha.test.ts`
- Create: `src/lib/auth-captcha.ts`
- Create: `src/components/auth/TurnstileGate.tsx`
- Modify: `src/routes/auth.tsx`
- Modify: `src/routes/reset-password.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `.env.production.example`
- Modify: `.dev.vars.example`

**Interfaces:**
- Uses public env `VITE_TURNSTILE_SITE_KEY` only.
- Produces `captchaToken` for sign-up/sign-in/reset operations.
- Supabase Auth CAPTCHA remains disabled until a real Cloudflare secret is entered in Supabase Dashboard; then frontend and backend can be enabled together without breaking login.

- [ ] **Step 1: Write RED tests**

Test policy:

```ts
expect(captchaRequired("site-key")).toBe(true);
expect(captchaRequired("")).toBe(false);
expect(assertCaptchaReady("site-key", null)).toEqual({ ok: false, reason: "CAPTCHA_REQUIRED" });
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- src/lib/auth-captcha.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add Turnstile component and token plumbing**

Use `@marsidev/react-turnstile`. When `VITE_TURNSTILE_SITE_KEY` is set, block password form submission until a token is present. When not configured, keep the current auth path working so deployment does not lock out the owner.

Pass token to Supabase Auth options for sign-up and password sign-in. For password reset, pass the supported CAPTCHA option according to the installed Supabase JS type; if the reset API type does not expose it in this version, upgrade only the patch/minor `@supabase/supabase-js` version after tests.

Google OAuth does not depend on the password-form Turnstile gate.

- [ ] **Step 4: Document activation sequence**

1. Create Turnstile widget for `swwiitch.com` and `www.swwiitch.com`.
2. Set public site key in Cloudflare Worker variable `VITE_TURNSTILE_SITE_KEY` / build environment.
3. Enter Turnstile secret in Supabase Auth → Bot and Abuse Protection.
4. Enable CAPTCHA.
5. Smoke-test sign-in, sign-up, reset, Google OAuth.
6. Enable leaked-password protection after password form test passes.

No secret value is committed.

- [ ] **Step 5: Run tests and commit**

Commit: `feat(auth): add Turnstile-ready abuse protection`

---

### Task 8: Security Center and Operational Hardening

**Files:**
- Modify: `src/routes/admin.security.tsx`
- Modify: `src/lib/admin.functions.ts`
- Modify: `README_SECURITY.md`
- Modify: `README_OPERATIONS.md`
- Modify: `supabase/tests/product_engine_rls.sql`

**Interfaces:**
- Produces truthful security status from database/app configuration where observable.

- [ ] **Step 1: Replace fake security values**

Do not claim MFA/session counts or suspicious attempts unless sourced. Display:
- recent `audit_logs`
- recent webhook processing status
- CAPTCHA configuration as `needs activation` unless app site key exists
- leaked-password protection as `manual Supabase setting` until verified
- RLS/sourcing isolation status based on production schema check exposed only server-side

- [ ] **Step 2: Keep `private.is_admin()` warning documented as an intentional RLS implementation**

Do not convert it to `SECURITY INVOKER` because the `profiles_select_own_or_admin` policy calls the predicate while the predicate reads `profiles`, which would cause RLS recursion. Keep the zero-argument, `auth.uid()`-bound, non-public implementation and document the rationale.

- [ ] **Step 3: Confirm bootstrap path is disabled**

Verify `owner-bootstrap` only returns HTTP 410 and cannot mutate users. Do not reintroduce a bootstrap token in repository code.

- [ ] **Step 4: Re-run Supabase Security Advisor**

Expected remaining warnings are documented intentional/manual items only. Any new RLS/grant warning introduced by this phase must be fixed before PR readiness.

- [ ] **Step 5: Commit**

Commit: `docs(security): harden and document Switch operations`

---

### Task 9: Full Verification, Preview, and PR

**Files:**
- No production code changes unless a verification failure requires a fix.

**Interfaces:**
- Produces a draft PR with reproducible evidence; does not merge to production without a final explicit landing decision.

- [ ] **Step 1: Run repository quality gate**

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx --yes wrangler@4.118.0 deploy --dry-run
npx --yes wrangler@4.118.0 versions upload --dry-run
```

All must pass.

- [ ] **Step 2: Run production DB assertions**

Re-run schema/privilege/product sellability checks and Supabase security/performance advisors.

- [ ] **Step 3: Smoke-test production-compatible flows on Cloudflare preview**

Required paths:
- `/`
- `/catalog`
- one approved product
- cart + checkout up to provider redirect without real charge
- `/auth`
- `/reset-password`
- `/admin/owner`
- `/admin/products`
- `/admin/codes`
- `/admin/security`

At 320px and desktop, confirm no horizontal overflow and no console errors.

- [ ] **Step 4: Open draft PR against `main`**

PR body must state:
- migrations applied/verified or pending
- exact CI result
- exact advisor result
- which 19 products remain `needs_review`
- Turnstile activation state
- manual launch gates still required

- [ ] **Step 5: Do not merge automatically**

Wait for final review/landing decision after CI and preview evidence are green.
