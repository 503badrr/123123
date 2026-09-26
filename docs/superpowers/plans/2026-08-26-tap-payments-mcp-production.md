# Tap Payments + ChatGPT MCP Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Switch's existing Tap integration with explicit Apple Pay mapping, Retrieve Charge reconciliation, safer payment-return status, refund primitives, and MCP-safe payment operations without exposing secrets.

**Architecture:** Extend the existing pluggable payment layer under `src/server/payments/`. Keep webhook processing and Supabase RPC idempotency authoritative. Add pure Tap normalization helpers for testability, server-only retrieval/reconciliation operations, and a narrow MCP-facing service that serializes safe payment data only.

**Tech Stack:** TypeScript 5.8, TanStack Start, React 19, Vitest 4, Supabase/PostgreSQL, Cloudflare Worker, Tap Payments API v2.

**Spec:** `docs/superpowers/specs/2026-08-26-tap-payments-mcp-production-design.md`

## Global Constraints

- Never expose `TAP_SECRET_KEY`, authorization headers, card PAN/CVC, tokens, or full Tap payloads to browser/MCP.
- Browser redirect is never proof of payment.
- Tap external state is reconciled server-to-server; Supabase atomic processing remains authoritative for local state and delivery.
- mada must use SAR.
- Explicit Apple Pay selection must map to `src_apple_pay`, not silently to `src_all`.
- Financial write actions require authenticated owner/admin authorization and audit logging.
- Work only on feature branch; do not modify `main` directly.

---

### Task 1: Extract and test Tap normalization/source rules

**Files:**
- Create: `src/server/payments/tap.logic.ts`
- Create: `src/server/payments/tap.logic.test.ts`
- Modify: `src/server/payments/tap.server.ts`

**Interfaces:**
- Produces `tapSourceId(method, currency, override?)`, `mapTapStatus(status)`, `formatTapAmount(value,currency)`, and safe Tap charge normalization helpers.

- [ ] Write failing Vitest cases for mada/card/Apple Pay source mapping, SAR-only mada, status normalization, and decimal precision.
- [ ] Run the focused test and confirm failure.
- [ ] Implement pure helpers in `tap.logic.ts`.
- [ ] Update `tap.server.ts` to consume the helpers.
- [ ] Run focused tests and typecheck.
- [ ] Commit `feat(payments): harden Tap source and status mapping`.

### Task 2: Add Retrieve Charge API support

**Files:**
- Modify: `src/server/payments/provider.server.ts`
- Modify: `src/server/payments/tap.server.ts`
- Create: `src/server/payments/tap.retrieve.test.ts`

**Interfaces:**
- Add optional provider method `retrieveCharge(providerRef: string): Promise<RetrievedCharge>`.
- `RetrievedCharge` returns providerRef, normalized status, providerStatus, amount, currency, orderReference, raw.

- [ ] Add failing tests for successful normalization and malformed/mismatched Tap responses.
- [ ] Extend provider interfaces with retrieval types.
- [ ] Implement `GET https://api.tap.company/v2/charges/{id}` with server-only Bearer auth.
- [ ] Reject missing ID/amount/currency/order reference before reconciliation.
- [ ] Run tests/typecheck.
- [ ] Commit `feat(payments): add Tap charge retrieval`.

### Task 3: Add safe payment reconciliation and return-status lookup

**Files:**
- Create: `src/server/payments/reconcile.server.ts`
- Create: `src/lib/payment-status.functions.ts`
- Modify: `src/routes/success.tsx`
- Create: `src/server/payments/reconcile.test.ts`

**Interfaces:**
- `reconcileOrderPayment(orderNumber)` loads the local payment, retrieves Tap charge, validates ID/amount/currency/order reference, and feeds a deterministic reconciliation event through the existing atomic payment processor.
- `getPaymentReturnStatus` exposes only `{orderNumber,status,nextAction}`.

- [ ] Add failing tests for paid/pending/failed status and mismatch rejection.
- [ ] Implement server reconciliation using deterministic event IDs and the existing payment-processing RPC.
- [ ] Add a public-safe server function keyed by order number with rate limiting.
- [ ] Update `/success` to render confirmed paid, pending, or verified failure states without trusting query parameters.
- [ ] Run tests/typecheck/build.
- [ ] Commit `feat(checkout): reconcile Tap status on return`.

### Task 4: Add payment method capability gating

**Files:**
- Create: `src/lib/payment-capabilities.functions.ts`
- Modify: `src/routes/checkout.tsx`
- Modify: `.env.example`
- Modify: `.env.production.example`

**Interfaces:**
- Server returns enabled methods for active provider.
- Add `TAP_MERCHANT_ID` and `TAP_APPLE_PAY_ENABLED=0` examples.

- [ ] Test that Apple Pay is hidden/disabled unless explicitly enabled and Tap configured.
- [ ] Test mada remains available only for SAR checkout.
- [ ] Wire checkout UI to server capabilities while preserving duplicate-submit guard.
- [ ] Run tests/typecheck/build.
- [ ] Commit `feat(checkout): gate payment methods by provider capability`.

### Task 5: Add refund persistence and Tap refund primitive

**Files:**
- Create: `supabase/migrations/20260826_create_payment_refunds.sql`
- Create: `supabase/tests/payment_refunds_rls.sql`
- Modify: `src/server/payments/provider.server.ts`
- Modify: `src/server/payments/tap.server.ts`
- Create: `src/server/payments/refunds.server.ts`
- Create: `src/server/payments/refunds.test.ts`

**Interfaces:**
- Add `createRefund(input)` provider operation.
- Service validates paid payment, refundable balance, reason enum, authorization, and writes audit records.

- [ ] Add failing validation tests for full/partial/over-refund and reason enum.
- [ ] Add `payment_refunds` migration, indexes, RLS, and assertions.
- [ ] Implement Tap `POST /v2/refunds/`.
- [ ] Implement owner/admin refund service and audit correlation ID.
- [ ] Run tests/typecheck and SQL assertions where available.
- [ ] Commit `feat(payments): add controlled Tap refunds`.

### Task 6: Add MCP-safe payment service boundary

**Files:**
- Create: `src/server/mcp/payments.server.ts`
- Create: `src/server/mcp/payments.test.ts`
- Modify relevant MCP registration file only if one exists in this repository.

**Interfaces:**
- Read operations: `tap_get_payment`, `tap_verify_payment`, `tap_get_order_payment`, `tap_list_payments`.
- Write operations: `tap_create_payment`, `tap_refund_payment`, both authorization/confirmation-gated.
- Responses expose only safe payment fields.

- [ ] Add serializer redaction tests proving raw payloads/secrets/PII cannot escape.
- [ ] Implement bounded read operations with authentication.
- [ ] Implement write guards and confirmation requirement.
- [ ] Register tools only if the existing repository MCP surface supports them; otherwise expose the service boundary and document registration for the dedicated MCP repo.
- [ ] Run tests/typecheck.
- [ ] Commit `feat(mcp): expose safe Switch payment operations`.

### Task 7: Documentation, observability, and release verification

**Files:**
- Modify: `README_OPERATIONS.md`
- Modify: `docs/production-integrations.md`
- Modify: `.env.example`

**Interfaces:**
- Document preview/live configuration, Tap webhook URL, Apple Pay enablement, reconciliation, refunds, and post-deploy checks.

- [ ] Add structured safe logging/correlation guidance and no-PII rules.
- [ ] Document Tap test-mode verification sequence and production secret placement.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run Cloudflare dry-run commands when CI/runtime supports them.
- [ ] Review branch diff for secrets and unintended UI changes.
- [ ] Commit `docs: finalize Tap production runbook`.
