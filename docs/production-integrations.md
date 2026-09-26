# Switch Production Integrations

## Confirmed

- GitHub repo: `503badrr/cosmic-switch-preview`
- Supabase project: `switch-production`
- Supabase ref: `slnjgmwckknzwjcmlolj`
- Supabase URL: `https://slnjgmwckknzwjcmlolj.supabase.co`
- Production hosting target: Cloudflare Worker
- Production payment provider target: Tap Payments

## Required deployment environment variables

Do not commit real secret values to the repository. Backend-only values belong in Cloudflare deployment secrets.

```env
PUBLIC_SITE_URL=https://swwiitch.com
PUBLIC_API_URL=https://swwiitch.com/api
PUBLIC_SUPPORT_EMAIL=support@swwiitch.com

SUPABASE_URL=https://slnjgmwckknzwjcmlolj.supabase.co
VITE_SUPABASE_URL=https://slnjgmwckknzwjcmlolj.supabase.co
SUPABASE_PUBLISHABLE_KEY=<production publishable key>
VITE_SUPABASE_PUBLISHABLE_KEY=<production publishable key>
SUPABASE_SERVICE_ROLE_KEY=<backend secret>

PAYMENT_PROVIDER=tap
TAP_PUBLISHABLE_KEY=<Tap publishable key>
TAP_SECRET_KEY=<Tap backend secret>
TAP_MERCHANT_ID=<Tap merchant id>
TAP_STATEMENT_DESCRIPTOR=Switch
TAP_APPLE_PAY_ENABLED=0

OPENAI_API_KEY=<backend secret when used>
```

`TAP_APPLE_PAY_ENABLED` must remain `0` until Apple Pay has actually been enabled for the Switch merchant in Tap. Once enabled, set it to `1`; the checkout then exposes Apple Pay and uses `src_apple_pay` explicitly.

`TAP_SOURCE_ID` is an optional controlled override and normally should remain unset so the checkout maps methods explicitly:

- mada -> `src_sa.mada` and SAR only
- Visa / Mastercard -> `src_card`
- Apple Pay -> `src_apple_pay`

## Tap endpoints and return flow

Production webhook:

```text
https://swwiitch.com/api/public/webhooks/tap
```

Checkout return:

```text
https://swwiitch.com/success?id=<order_number>
```

The return page is not proof of payment. Switch retrieves the Tap charge server-to-server, validates charge ID, amount, currency, and order reference, then sends the normalized state through the existing atomic `switch_process_payment_webhook` RPC. Delayed webhooks and return-page reconciliation therefore converge on the same idempotent payment state machine.

## Refunds

Refunds use a separate `payment_refunds` ledger and a server-only reservation RPC. A refund request is reserved under a row lock before Tap is called, preventing concurrent partial refunds from exceeding the captured payment amount.

Rules:

- Only paid Tap payments are refundable.
- Full and partial refunds are supported.
- Supported reasons: `duplicate`, `fraudulent`, `requested_by_customer`.
- Browser roles have no direct access to the refund ledger or reservation RPC.
- Admin refund actions require authenticated admin access and the explicit confirmation token `CONFIRM_REFUND`.
- A partial refund does not mark the full order as refunded. The payment/order moves to `refunded` only after successful refunds total the captured amount.
- Refund webhook objects are processed separately from charge/payment webhooks.

Before enabling production refunds, apply and verify:

```text
supabase/migrations/20260826003000_payment_refunds.sql
supabase/tests/payment_refunds_rls.sql
```

## ChatGPT / MCP payment boundary

The storefront repository exposes a server-only payment service boundary in:

```text
src/server/mcp/payments.server.ts
```

Available safe operations for a dedicated MCP adapter:

- `tap_get_payment` -> `tapGetPayment`
- `tap_get_order_payment` -> `tapGetOrderPayment`
- `tap_list_payments` -> `tapListPayments`
- `tap_verify_payment` -> `tapVerifyPayment`
- `tap_refund_payment` -> `tapRefundPayment`

The repository does not currently contain an MCP transport/registry runtime, so these operations are intentionally not exposed as a public HTTP/MCP endpoint from the storefront. A dedicated authenticated MCP server should register them as adapters rather than duplicating payment logic.

The MCP boundary returns only whitelisted payment fields. It never returns Tap raw payloads, authorization headers, card/token data, customer email/phone, `TAP_SECRET_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`.

Financial writes through MCP require an authenticated `admin` or `owner` actor and the exact `CONFIRM_REFUND` confirmation. There is intentionally no generic MCP `tap_create_payment` write tool in this release: storefront checkout remains the single charge-creation path, preventing accidental duplicate charges until an authenticated MCP transport has a durable idempotency contract for charge creation.

## Never expose

```env
VITE_OPENAI_API_KEY=
PUBLIC_OPENAI_API_KEY=
VITE_TAP_SECRET_KEY=
PUBLIC_TAP_SECRET_KEY=
VITE_SUPABASE_SERVICE_ROLE_KEY=
```

Never expose backend keys in the browser bundle, ChatGPT tool results, logs, screenshots, or committed files.

## Production verification sequence

1. Apply the refund migration in a non-production/staging branch first when available.
2. Run `payment_refunds_rls.sql` assertions and verify rollback completes without errors.
3. Set Tap test/sandbox secrets and `PAYMENT_PROVIDER=tap` in a preview environment.
4. Complete a mada/card sandbox payment and confirm the browser returns to `/success`.
5. Confirm `/success` remains pending until server verification succeeds and only shows paid after a valid Tap result.
6. Send a webhook with an invalid hashstring and confirm HTTP 401 with no payment transition.
7. Replay a valid captured event and confirm it is processed once only.
8. Test a partial refund and confirm the order remains paid/fulfilled while the refund ledger records the refunded amount.
9. Test the remaining refund and confirm the payment/order moves to refunded only when the full captured amount has been refunded.
10. Verify no Tap secret, raw card/token data, digital code, or customer PII appears in logs or MCP responses.
11. Run `npm run ci` and both Cloudflare dry-runs before merge.
12. Only after sandbox acceptance, configure Tap live secrets in Cloudflare and enable production webhook delivery.

## Security rules

- `TAP_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY` are backend-only.
- The redirect page never decides payment success from URL parameters.
- Tap webhook verification and server-to-server retrieval are independent payment evidence paths that converge on the same atomic processor.
- Financial actions are authenticated, authorization-gated, confirmation-gated, and audited.
- Do not deploy a new MCP transport that bypasses `src/server/mcp/payments.server.ts` safeguards.
