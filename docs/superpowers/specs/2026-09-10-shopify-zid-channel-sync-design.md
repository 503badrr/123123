# Shopify + Zid Channel Sync Design

## Goal
Keep `swwiitch.com` as the Cloudflare/TanStack storefront, use Shopify as the source of truth for catalog/cart/checkout, and add Zid as a secondary Saudi sales channel without exposing Zid or Shopify private credentials to the browser.

## Architecture
- `swwiitch.com` remains the customer-facing React/TanStack Start application on the existing Cloudflare Worker.
- Shopify Storefront API is the authoritative catalog/cart/checkout integration.
- Zid Merchant API is accessed server-side only from the Switch backend.
- Product identity is correlated by SKU. Shopify remains authoritative for title, price, availability, and publish intent; Zid stores the channel copy.
- Zid order events enter Switch through an authenticated webhook endpoint and are normalized before downstream fulfillment logic.
- Zid sync is fail-closed when credentials are missing and never falls back to browser-visible credentials.

## Zid credentials and scopes
Runtime-only environment variables:
- `ZID_AUTHORIZATION_TOKEN`
- `ZID_MANAGER_TOKEN`
- `ZID_STORE_ID`
- `ZID_WEBHOOK_USERNAME`
- `ZID_WEBHOOK_PASSWORD`

Required Zid scopes:
- `products.read`
- `products.read_write`
- `orders.read`
- `third_webhook_read`
- `third_webhook_write`

## Zid API contract
Base URI: `https://api.zid.sa/v1`.
Manager requests use server-side credentials and include the manager/store headers required by the endpoint. Product sync uses `GET /products/`, `POST /products/`, and `PATCH /products/{product_id}/`. Digital Switch items map to Zid `voucher` where delivery is a code/license and to `downloadable` only when the product is a file download.

## Product synchronization
- Match by exact SKU.
- Never create or update Zid products when Shopify SKU is missing.
- Create new Zid products as drafts first when a safe automatic publish decision cannot be made.
- Preserve a deterministic payload: Arabic name, English fallback name, SKU, price, sale price when present, `requires_shipping=false`, and the intended digital product class.
- No voucher codes are copied as catalog metadata. Voucher inventory/keys are handled separately from product metadata.

## Orders and webhooks
- Endpoint: `POST /api/zid/webhooks`.
- Accept only HTTPS production traffic and authenticated webhook requests.
- Verify Basic Authentication against `ZID_WEBHOOK_USERNAME` and `ZID_WEBHOOK_PASSWORD` using constant-time comparison.
- Accept the supported events `order.create`, `order.status.update`, and `order.payment_status.update`; reject unsupported events.
- Build an idempotency key from event type + Zid order id + event/status timestamp where available. Duplicate delivery must not trigger duplicate fulfillment.
- The first implementation normalizes and acknowledges events; it does not release digital codes until the existing Switch fulfillment service is explicitly wired to a verified paid event.

## Shopify hardening
- Keep Storefront API pinned to `2026-07`.
- Use current Storefront schema fields: `product(handle:)`, `collection(handle:)`, `node(id:)` for variant lookup, and no removed `Shop.currencyCode` field.
- Remove deprecated cart tax/duty fields from the shared cart fragment.
- Keep private Storefront token server-only.

## Release gates
1. Shopify GraphQL operations validate against Storefront `2026-07`.
2. Unit tests for Zid config, headers, product mapping, webhook authentication, event allowlist, and idempotency helper pass.
3. `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` pass in CI or an equivalent trusted runner.
4. Zid live connectivity test must return an authenticated product-list response before any product write is enabled.
5. Zid product writes remain opt-in behind `ZID_SYNC_WRITES_ENABLED=1`.
6. Merge to `main` only after the branch is current with `main` and the required tests execute successfully.
