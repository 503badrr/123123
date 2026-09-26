# Tap Payments + ChatGPT MCP Production Design

**Date:** 2026-08-26

## Goal

Upgrade the existing Switch payment subsystem into a production-grade Tap Payments integration for Saudi checkout, while preserving the current pluggable provider architecture and exposing carefully scoped payment operations to ChatGPT through MCP without ever exposing Tap secrets to the browser or the model.

## Existing baseline

Switch already has:

- TanStack Start + React 19 frontend/backend.
- Pluggable payment provider layer under `src/server/payments/`.
- Existing `tap.server.ts` charge creation and Tap hashstring webhook verification.
- `PAYMENT_PROVIDER` runtime selection.
- `payments` and `webhook_events` persistence through Supabase.
- Shared idempotent webhook processing via `switch_process_payment_webhook`.
- Checkout UI supporting mada, Visa, Mastercard, and Apple Pay labels.
- `/success` return page that correctly states that redirect alone is not proof of payment.

This design extends that baseline rather than introducing a parallel payment stack.

## Source-of-truth rules

1. Tap is the source of truth for the external charge state.
2. Supabase is the source of truth for Switch order/payment state after verified synchronization.
3. Browser redirects are never trusted as proof of payment.
4. A payment can transition an order to paid/deliverable only after a verified Tap webhook or an authenticated server-to-server Retrieve Charge reconciliation.
5. No client request may supply the final charged amount; totals remain server-calculated.
6. `TAP_SECRET_KEY` is server-only and must never use a `VITE_` or public environment prefix.

## Tap API behavior

### Charge creation

Use `POST https://api.tap.company/v2/charges/` with:

- `Authorization: Bearer <TAP_SECRET_KEY>`.
- server-calculated `amount` and ISO currency.
- `customer_initiated: true`.
- `threeDSecure: true`.
- `save_card: false` unless a future explicitly approved tokenization design is implemented.
- `reference.transaction` and `reference.order` set to the Switch order number.
- `metadata.udf1` set to the internal Switch order ID.
- `redirect.url` pointing to the Switch payment-return page.
- `post.url` pointing to `/api/public/webhooks/tap`.

### Payment source mapping

- mada -> `src_sa.mada` and require SAR.
- Visa -> `src_card`.
- Mastercard -> `src_card`.
- Apple Pay -> `src_apple_pay` when the merchant account/domain is enabled for Apple Pay.
- A future generic hosted choice may use `src_all`, but explicit user-selected Apple Pay must not silently fall back to `src_all`.

### Redirect handling

If Tap returns `transaction.url`, redirect the browser there.

The return route must not display a definitive success state from query parameters alone. It should trigger a server-side payment-status lookup by Switch order number. The server should use the local payment record and, when needed, Retrieve Charge (`GET /v2/charges/{charge_id}`) to reconcile the latest Tap state.

### Webhook validation

Continue validating Tap's `hashstring` using HMAC-SHA256 and constant-time comparison. Preserve Tap's currency decimal precision when composing the signed string.

The verified webhook remains the primary asynchronous synchronization path and must continue using the existing atomic `switch_process_payment_webhook` RPC for replay/idempotency protection.

## Status model

Normalize Tap charge statuses to Switch states without collapsing recoverable states into generic failure too early.

Recommended external normalization:

- `CAPTURED` -> `captured` / local payment `paid`.
- `AUTHORIZED` -> `authorized`.
- `INITIATED`, `IN_PROGRESS`, `PENDING` -> `pending`.
- `ABANDONED`, `CANCELLED`, `DECLINED`, `FAILED`, `RESTRICTED`, `TIMEDOUT`, `VOID`, `VOIDED` -> `failed` with raw provider status retained.
- `REFUNDED` -> `refunded`.
- unknown statuses -> `pending` plus observability warning; never mark paid.

The raw Tap status must remain stored in the payment payload for investigation/reconciliation.

## Retrieve Charge reconciliation

Add a server-only Tap operation:

`retrieveCharge(chargeId)` -> normalized charge detail.

Uses:

- customer return page status refresh.
- operator/admin reconciliation.
- MCP read tools.
- recovery if a webhook is delayed or missed.

Reconciliation rules:

1. Read the local payment by order number/provider reference.
2. Retrieve the charge from Tap server-to-server.
3. Validate provider charge ID, amount, currency, and order reference against the local payment/order.
4. Feed the normalized event into the same atomic processing path used for verified webhooks, using a deterministic reconciliation event ID distinct from the webhook event ID.
5. Never deliver twice; existing DB idempotency remains authoritative.

## Refunds

Add server-only Tap refund support through `POST /v2/refunds/`.

Requirements:

- Admin/owner only.
- Original payment must be paid/captured.
- Requested amount must be positive and cannot exceed remaining refundable amount.
- Support full and partial refunds.
- Store Tap refund ID, charge ID, amount, currency, reason, status, actor, and timestamps.
- Valid reasons exposed by Switch: `duplicate`, `fraudulent`, `requested_by_customer`.
- Refund creation must write an audit log before/after the external operation with no secrets or full customer payment data.
- Refund completion is asynchronous; webhook/reconciliation updates final refund state.
- No automatic refund tool is exposed to ChatGPT without explicit user confirmation and owner authorization.

## Checkout UX

Keep the current checkout structure and visual language. Add only targeted production improvements:

- Explicitly show enabled/disabled payment methods from server capability/configuration rather than presenting an option that cannot succeed.
- Apple Pay shown only when Tap/merchant setup allows it; selecting Apple Pay uses `src_apple_pay`.
- mada requires SAR and displays a clear local-method label.
- Disable duplicate submit while charge creation is in progress (already present; preserve it).
- Preserve server-side rate limiting and server-calculated totals.
- Convert provider/internal errors to stable Arabic customer-safe messages while logging diagnostic provider codes server-side.

## Payment return page

Evolve `/success` into a payment result/status page with three safe UI states:

- Confirmed paid: payment verified and order paid/delivered or processing delivery.
- Pending: Tap charge exists but final state is not yet confirmed.
- Failed/cancelled: verified non-success status with retry/back-to-cart action.

The page must never infer `paid` solely because the user arrived from Tap.

## Environment configuration

Keep existing variables and add only what is needed:

```env
PAYMENT_PROVIDER=tap
TAP_PUBLISHABLE_KEY=
TAP_SECRET_KEY=
TAP_SOURCE_ID=
TAP_STATEMENT_DESCRIPTOR=Switch
TAP_MERCHANT_ID=
TAP_APPLE_PAY_ENABLED=0
```

`TAP_SOURCE_ID` remains an optional global override for controlled testing. In production, method-specific mapping is preferred.

No real values are committed.

## Database additions

Reuse existing `orders`, `payments`, `webhook_events`, and `audit_logs`.

Add a `payment_refunds` table only if no equivalent exists, with:

- `id uuid primary key`.
- `payment_id uuid not null`.
- `provider text not null`.
- `provider_refund_id text unique`.
- `provider_payment_id text not null`.
- `amount numeric not null check (amount > 0)`.
- `currency text not null`.
- `reason text not null`.
- `status text not null`.
- `requested_by uuid`.
- `raw_payload jsonb`.
- `created_at timestamptz`.
- `updated_at timestamptz`.

RLS: ordinary customers may read only refunds attached to their own orders if product requirements demand it; insert/update is server/admin only.

## MCP / ChatGPT architecture

ChatGPT must never call Tap directly. MCP calls Switch server operations, and Switch calls Tap.

Read tools:

- `tap_get_payment(order_number | charge_id)`.
- `tap_verify_payment(order_number)`.
- `tap_get_order_payment(order_number)`.
- `tap_list_payments(filters)` with bounded pagination and no sensitive card data.

Write tools:

- `tap_create_payment(order_number, payment_method)` only for an already validated Switch order and with explicit user action.
- `tap_refund_payment(order_number, amount?, reason)` owner/admin only and confirmation-gated.

Tool responses expose only necessary fields: order number, provider charge/refund ID, amount, currency, normalized status, provider status, timestamps, and safe next action. Never return Tap secret keys, authorization headers, full webhook payloads, card PAN, CVC, tokens, or unnecessary PII.

## Authorization and audit

- MCP read operations require an authenticated Switch identity or tightly scoped service identity.
- Financial write actions require owner/admin authorization.
- Refund writes require explicit confirmation at execution time.
- Every financial write creates an `audit_logs` record including actor, action, order/payment ID, amount, reason, result, and correlation ID.
- Secrets stay in Cloudflare/Switch server environment only.

## Observability

Add structured server logs/correlation IDs for:

- charge creation request/result (without authorization header or PII-heavy payloads),
- Tap HTTP failure status and safe provider error code,
- webhook signature rejection,
- duplicate webhook,
- amount/currency/reference mismatch,
- reconciliation run/result,
- refund request/result.

Do not log full card/customer payloads or secret values.

## Reliability / idempotency

- Continue DB-enforced webhook idempotency.
- Reconciliation uses deterministic event IDs and the same payment-processing transaction/RPC.
- Prevent multiple active payment sessions for the same order when one is already captured.
- Allow a controlled retry after a failed/expired charge by creating a new payment row/charge while preserving previous attempts.
- Never mutate historical raw provider payloads destructively.

## Testing

Add Vitest coverage for pure Tap logic and server operations:

1. source mapping: mada/card/Apple Pay.
2. SAR-only mada validation.
3. webhook hashstring valid/invalid.
4. currency decimal formatting.
5. Tap status normalization.
6. charge API success/missing redirect/error.
7. Retrieve Charge normalization and mismatch rejection.
8. checkout refuses unavailable payment method.
9. return-page server status returns paid/pending/failed safely.
10. duplicate reconciliation cannot redeliver.
11. full/partial refund validation.
12. MCP tool serializers redact raw/private fields.

CI remains `typecheck + lint + test + build` plus Cloudflare dry-runs.

## Rollout

1. Implement/test on a feature branch.
2. Use Tap test keys only in preview.
3. Verify mada redirect flow and webhook hashstring in Tap test mode.
4. Verify return-page reconciliation when webhook is delayed.
5. Verify duplicated webhook/reconciliation does not duplicate code delivery.
6. Enable Apple Pay UI only after Tap merchant/domain activation is confirmed.
7. Test a controlled refund in Tap test mode.
8. Set production secrets in Cloudflare Worker environment, never GitHub source.
9. Deploy through the existing PR/CI process.
10. Perform post-deploy Tap dashboard ↔ Switch payment reconciliation.

## Out of scope

- Storing raw card data.
- Direct ChatGPT access to Tap secret keys.
- Card-on-file/tokenization or recurring billing.
- Autonomous refunds without owner confirmation.
- Replacing the existing provider abstraction or Supabase payment processor.
