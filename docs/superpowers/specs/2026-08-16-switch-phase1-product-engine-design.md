# Switch Phase 1 Product Engine Design

Date: 2026-08-16
Status: Approved direction — Hybrid (Option C)
Scope: Phase 1 only

## 1. Objective

Transform Switch from a partially demo-driven storefront into a production-ready commerce foundation without rebuilding working visual and routing layers from scratch.

Phase 1 focuses on five outcomes:

1. Keep the existing storefront and admin UX where it is already useful.
2. Remove demo-only commercial metrics from the owner console.
3. Make Supabase the source of truth for products, inventory, orders, and financial state.
4. Introduce a real product-management model that supports digital goods first and future physical products without exposing supplier identity to customers.
5. Preserve safe rollback and avoid destructive changes to production data.

## 2. Verified Current State

The current production project is `switch-production` (`slnjgmwckknzwjcmlolj`) and is healthy.

Observed production state at design time:

- 19 active rows in `public.products`.
- 0 rows in `public.orders`.
- 0 rows in `public.payments`.
- 0 rows in `public.digital_codes`.
- 1 owner account and an administrative profile model using `owner`, `admin`, `staff`, and `customer` roles.
- RLS is enabled on the public commerce tables.
- The owner dashboard currently imports hard-coded KPI, revenue, category, queue, financial, and security sample values from `src/data/admin.ts`.
- Existing admin screens are useful as presentation scaffolding but must not present demo values as production facts.

## 3. Architectural Decision

Use the approved Hybrid approach:

- Preserve stable routes, visual components, layout, branding, and storefront behavior.
- Replace sample data and weak product assumptions with production data access in small, testable steps.
- Add the missing commerce data model through additive migrations.
- Do not expose supplier names or upstream sourcing details in the customer-facing UI.
- Keep supplier and acquisition data as privileged internal metadata for operations, profitability, reconciliation, and fulfillment.

## 4. Customer-Facing Catalog Structure

The primary storefront categories for Phase 1 are:

- بطاقات رقمية
- شحن الالعاب
- الاشتراكات
- الخدمات الرقمية
- العروض

The UI may group products further by platform or brand, but the source of supply is never a customer-facing taxonomy.

Customer-visible product information may include:

- Arabic and English product names where appropriate.
- Product image.
- Current price.
- Previous price only when a real comparison price exists.
- Discount percentage derived from actual prices.
- Region or redemption restrictions.
- Delivery method.
- Expected delivery time.
- Usage instructions.
- Terms and refund restrictions.
- Stock or availability state expressed in customer-safe language.

Customer-visible product pages must not show supplier identifiers, acquisition costs, vendor SKUs, API provider names, or internal margin fields.

## 5. Product Data Model

Keep `public.products` as the canonical sellable-product table and extend it additively where necessary.

Required operational concepts:

### Product identity

- `id`
- `slug`
- `sku` — Switch-owned public/internal SKU
- `name_ar`
- `name_en`
- `category`
- `platform`
- `region`

### Merchandising

- `description_ar`
- `image_url`
- `price`
- `old_price`
- `currency`
- `is_active`
- `sort_order`
- optional featured/new flags if not already represented elsewhere

### Fulfillment

A controlled fulfillment type should distinguish at least:

- `digital_code`
- `manual`
- `service`
- future `physical`

Fulfillment type is internal behavior metadata, not supplier disclosure.

### Supplier/acquisition metadata

Supplier data should be normalized into a separate privileged table instead of adding raw secrets or excessive supplier fields directly to `products`.

Recommended internal tables:

#### `suppliers`

- `id`
- `name_internal`
- `status`
- `integration_type`
- `created_at`
- `updated_at`

Only owner/admin server-side operations may read or mutate supplier records.

#### `product_sources`

Maps a Switch product to one or more internal sources:

- `id`
- `product_id`
- `supplier_id`
- `supplier_sku`
- `cost_price`
- `currency`
- `stock_status`
- `priority`
- `is_active`
- `last_synced_at`
- `created_at`
- `updated_at`

No public/anonymous read access.

This separation allows Switch to replace a supplier without changing the customer-facing product identity or URL.

## 6. Digital Inventory

Keep `public.digital_codes` as the digital inventory ledger.

Requirements:

- A code belongs to exactly one product.
- A code can move through controlled states: available, reserved, delivered, disabled.
- The same code must never be delivered to more than one order item.
- Assignment must be transactional and concurrency-safe.
- Raw redeemable values must never be exposed through generic public data queries.
- Admin bulk import should support CSV after validation.
- Import must report accepted, duplicate, invalid, and rejected rows.
- Low-stock thresholds should be configurable per product or via a sensible default.

No production order may be marked fulfilled merely because the browser returned from a payment provider.

## 7. Orders and Payment Truth

`orders`, `order_items`, and `payments` remain the authoritative commercial ledger.

Rules:

- Order totals are calculated server-side from current sellable product records.
- Clients cannot authoritatively set paid/fulfilled states.
- Payment success comes from a validated payment-provider webhook or another explicitly trusted server-side confirmation path.
- Fulfillment begins only after a valid paid state.
- Webhook handling remains idempotent.
- Refund and cancellation states must remain distinct from failed payment states.

Phase 1 does not require replacing every payment provider. It requires making the product and dashboard layers truthful and ready for a single verified production payment path.

## 8. Owner Console

The current console layout is retained, but all demo commercial data is removed.

### Owner dashboard

Production KPIs should be sourced from database queries or server functions, including:

- Revenue today.
- Paid orders today.
- Active customers based on an explicit definition.
- Average order value.
- Net sales for a selected period.
- Refunds.
- Product cost where source cost is available.
- Gross profit and gross margin where cost data is complete.
- Low-stock product count.
- Failed-payment count.

When no transactions exist, the UI must show zero or an honest empty state, never sample revenue.

### Product management

Owner/admin capabilities:

- Create product.
- Edit product.
- Activate/deactivate product.
- Reorder merchandising priority.
- Set price and real comparison price.
- Manage product media.
- Set fulfillment type.
- Assign internal source records.
- Inspect cost, margin, and source status.
- Inspect digital-code stock counts.

Supplier fields must not be sent to customer-facing product queries.

### Inventory management

- Add codes manually.
- Import validated CSV.
- Disable compromised or invalid codes.
- View counts by status.
- Never reveal all usable codes in ordinary list views unless explicitly requested by an authorized owner/admin workflow.

## 9. Financial Metrics

The existing hard-coded finance rows must be removed.

Financial reporting should distinguish:

- Gross paid revenue.
- Discounts.
- Refunds.
- Cost of goods sold where available.
- Payment fees where captured.
- Gross profit.
- Gross margin.

`Net profit` must not be displayed unless the system also has a defined source for operating expenses. Until then the dashboard should use accurate labels such as `اجمالي الربح` or `هامش الربح` rather than claiming full net profit.

## 10. Security and Authorization

Phase 1 must preserve or improve existing controls:

- RLS remains enabled.
- Product public reads expose only customer-safe fields.
- Supplier and acquisition tables are server/admin only.
- Order and payment state mutations remain server-controlled.
- Digital code delivery remains server-controlled.
- Admin routes verify current role; UI hiding alone is insufficient.
- Audit logs are written for sensitive product, inventory, and source mutations.
- No service-role key is shipped to browser code.
- Secrets remain in server environment or Supabase Edge Function secrets.

Known security follow-ups observed at design time:

- Supabase leaked-password protection remains disabled and should be enabled after the login CAPTCHA path is fixed correctly.
- The current advisor warning around executable `private.is_admin()` should be resolved during the security hardening pass without breaking RLS authorization.
- Temporary bootstrap mechanisms must not remain an active administration path.

## 11. Data Migration Strategy

The 19 current product rows are preserved initially.

Phase 1 will not hard-delete them as a first action.

Process:

1. Add required schema extensions and internal source tables.
2. Classify the current 19 products as unverified/needs-review using an internal lifecycle mechanism.
3. Customer visibility is controlled by validated sellability rules, not mere row existence.
4. Review each product for real price, source, region, fulfillment method, and inventory.
5. Activate only products that meet the launch checklist.

This preserves rollback and prevents accidental loss of useful catalog structure.

## 12. Product Sellability Gate

A product may be purchasable only when all required conditions pass:

- active product record
- valid positive sale price
- supported currency
- valid category
- approved region/restriction metadata
- supported fulfillment type
- verified internal source or verified internal inventory
- sufficient available stock for code-based fulfillment, unless explicitly marked manual/service
- no unresolved product-level block

A product may still be visible as `غير متوفر` when merchandising requires it, but checkout must reject non-sellable inventory server-side.

## 13. Error Handling

Customer-facing errors must be safe and actionable:

- unavailable product → explain that it is temporarily unavailable
- price changed → refresh cart and require confirmation
- payment pending → do not deliver
- fulfillment temporarily unavailable → retain paid order in processing state and alert operations
- no digital code available after payment → fail safely into manual operational review, never invent a code and never mark fulfilled

Operational errors should be recorded with structured context without logging secrets or redeemable code plaintext.

## 14. Testing Strategy

Phase 1 requires automated coverage for critical behavior:

### Product

- public product query excludes internal source fields
- inactive/non-sellable products cannot be purchased
- pricing validation
- category/fulfillment validation

### Inventory

- duplicate digital code prevention
- atomic reservation/assignment
- two simultaneous orders cannot receive the same code
- disabled code cannot be delivered

### Orders/payments

- client cannot mark order paid
- invalid webhook cannot fulfill
- idempotent webhook processing
- paid state triggers fulfillment exactly once

### Admin

- customer cannot access owner/admin mutations
- staff permissions match policy
- product source data remains unavailable to public users

### Dashboard

- zero real orders yields zero/empty KPIs
- seeded test transactions produce expected aggregates
- no import from demo KPI arrays remains in production dashboard paths

## 15. Rollout

Rollout is incremental:

1. Add schema and policies.
2. Add server-side product/admin services.
3. Replace owner dashboard demo metrics with real aggregates.
4. Add product-management UI.
5. Add inventory-management UI.
6. Validate the current 19 products and hide anything unverified.
7. Run CI, migration assertions, auth/RLS tests, and mobile smoke tests.
8. Deploy through the existing Cloudflare Worker path only after checks pass.

No destructive cleanup of old demo modules occurs until all runtime imports have been removed and tests prove they are unused.

## 16. Explicitly Out of Scope for Phase 1

- Amazon/Noon/AliExpress deal aggregation.
- Exposing supplier identity to shoppers.
- Full loyalty-points redemption engine.
- Multi-supplier automated purchasing.
- Full accounting system replacement.
- Broad redesign of the storefront visual language.
- R2/MCP expansion unrelated to product commerce.

These can be separate phases after the core store is truthful and operational.

## 17. Phase 1 Acceptance Criteria

Phase 1 is complete when:

- Switch Console contains no fake commercial KPI or transaction data.
- Products can be created, edited, activated, deactivated, and priced by authorized admins.
- Supplier/source metadata is private and never exposed to customer queries.
- Current products are explicitly reviewed before sellability.
- Digital-code inventory is manageable and concurrency-safe.
- Product checkout eligibility is enforced server-side.
- Dashboard metrics come from real production records.
- Critical RLS, inventory, payment, and dashboard tests pass.
- Cloudflare production build/deploy validation passes.
- Production can roll back cleanly to the pre-phase-1 version if necessary.
