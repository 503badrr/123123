# Switch Catalog Pilot — Test Model

Date: 2026-08-26  
Status: Review-only pilot  
Production sale state: Blocked

## Outcome

The pilot gives Switch one safe review catalog with three departments:

1. Electronics: earbuds, chargers, cables, car mounts, and dash cams.
2. Digital subscriptions: generic entertainment and productivity entries until an authorized supplier and resale terms are verified.
3. AI assets: build packs, security review packs, prompt libraries, and automation-agent templates.

No pilot product has a sale price or purchase action. The optional SQL seed creates inactive `needs_review` rows with a block reason, so current public RLS policies exclude them.

## Verified Gaps

| Priority | Gap | Evidence | Required change |
| --- | --- | --- | --- |
| P0 | Storefront is disconnected from Supabase products | `src/routes/index.tsx`, `catalog.tsx`, category pages, item page, and cart import the empty local array from `src/data/products.ts` | Load products through server functions and resolve cart items by UUID from the server |
| P0 | A tracked `.env` exists | Repository root contains `.env`; `.gitignore` did not ignore it | Remove it from tracking, rotate any real secrets, and keep only example files |
| P0 | No product is currently public | Production `public.products` contains zero rows | Approve real items only after supplier, price, image, region, and fulfillment checks |
| P0 | Physical checkout is incomplete | Orders have no shipping-address or shipment model | Add addresses, delivery pricing, stock ledger, shipments, tracking, returns, and VAT handling |
| P1 | AI-asset delivery is incomplete | Existing fulfillment supports `service`, but there is no entitlement/version/download model | Add protected assets, entitlements, signed downloads, version history, and license terms |
| P1 | Product taxonomy is narrow in the client | Client types only know games/cards/subscriptions/offers; unknown DB categories become offers | Add electronics and AI taxonomies without exposing suppliers |
| P1 | Product administration is missing | Admin routes do not provide a complete product approval workflow | Add draft/review/approve/block, supplier source assignment, media, price, and inventory actions |
| P1 | Generated Supabase types are stale | Generated product type omits `sku`, `fulfillment_type`, `lifecycle_status`, thresholds, and block reason | Regenerate types after the schema is settled |
| P1 | Human verification protection is absent | No Turnstile integration was found | Add server-validated Turnstile to auth, contact, and checkout attempts |
| P1 | Supabase security warnings remain | Leaked-password protection is disabled; `private.is_admin()` is executable by authenticated; cron policies warn about anonymous access | Resolve each warning and rerun security advisors |
| P2 | Cloudflare account state is not verified in repository code | Repo config targets Worker `dark-disk-4155`; setup notes describe an expired build token | Verify the live Worker connection, custom domains, token, WAF, and preview deployment in the Cloudflare dashboard |

## Product Approval Gate

A product may become active only when all applicable checks pass:

- Verified supplier or owned asset.
- Sale/resale rights documented.
- Cost, SAR price, VAT treatment, and margin approved.
- Original product media and Arabic description approved.
- Region, compatibility, warranty, return, and delivery terms present.
- Physical item: stock, shipping, address, tracking, and return flow tested.
- Digital code: encrypted inventory, duplicate protection, reservation, and delivery tested.
- AI asset: license, version, entitlement, protected file, and support scope tested.
- Checkout recalculates price on the server.
- Valid provider webhook is the only source of paid state.
- Delivery begins only after trusted payment confirmation.

## Test Matrix

| Test | Expected result |
| --- | --- |
| Open `/catalog-pilot` | Three departments and 11 review-only products render |
| Filter departments | 5 electronics, 2 subscriptions, and 4 AI assets |
| Search engines inspect route | `noindex,nofollow,noarchive` is present |
| Select purchase action | Disabled; no cart or checkout mutation occurs |
| Apply optional seed in a review environment | Rows use price `0`, `is_active=false`, `lifecycle_status=needs_review`, and a block reason |
| Query as anonymous user | Pilot rows remain invisible under the existing product RLS gate |
| Duplicate seed execution | Existing pilot slugs are not duplicated |
| Mobile layout | Cards remain usable at narrow widths and controls retain 44px minimum height |
| Approve a physical item without shipping | Approval must fail operational review |
| Approve a subscription without resale rights | Approval must fail legal/supplier review |
| Deliver an AI asset before payment confirmation | Delivery must not occur |
| Retry the same payment webhook | Idempotency prevents duplicate fulfillment |

## Recommended Implementation Order

1. Remove tracked secrets and rotate exposed credentials.
2. Connect the existing catalog, detail, and cart flows to `listProducts`, `getProductBySlug`, and `getProductsByIds`.
3. Regenerate Supabase types and add product approval administration.
4. Add physical commerce tables and server-side shipping totals.
5. Add protected AI-asset entitlements and signed delivery.
6. Add server-side Turnstile validation and close Supabase advisor warnings.
7. Review supplier agreements and activate one product per fulfillment type in a non-production preview.
8. Run the complete quality gate and Cloudflare preview smoke test before any production activation.
