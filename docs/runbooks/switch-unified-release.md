# Switch unified release runbook

Release branch in every repository: `release/switch-unified-2026-08-01`.

This runbook is a staging and production handoff. The preparation phase does
not merge branches, deploy Workers, change DNS, or mutate the production
Supabase project.

## 1. Verify immutable inputs

1. Read `release/switch-unified-2026-08-01.json`.
2. Check out every component at its recorded commit SHA.
3. Confirm the working trees are clean.
4. Run each repository's quality workflow and retain the run URLs.

Stop if any component SHA differs from the manifest.

## 2. Supabase staging gate

Use a paid development branch or a separate staging project created with the
account owner's cost approval. Never test the migration on
`slnjgmwckknzwjcmlolj` first.

1. Apply migrations through
   `20260801205033_repair_admin_rls_and_webhook_indexes.sql`.
2. Run `supabase/tests/unified_release_rls.sql` with
   `ON_ERROR_STOP=1`.
3. As an authenticated non-admin, verify own orders/profile remain visible and
   admin-only rows remain hidden.
4. As an authenticated admin, verify orders, payments, support tickets,
   webhook events, audit logs, and digital codes can be queried.
5. Confirm anonymous product/banner reads still match the product decision.
6. Re-run Supabase security and performance advisors.

Do not grant authenticated users access to managed `auth`, `storage`, or
`extensions` objects. Do not apply the rejected destructive
`order_items` rewrite.

## 3. Tap sandbox gate

Configure only server-side deployment secrets:

- `PAYMENT_PROVIDER=tap`
- `TAP_SECRET_KEY=sk_test_...`
- `TAP_PUBLISHABLE_KEY=pk_test_...`
- optional `TAP_SOURCE_ID`
- `TAP_STATEMENT_DESCRIPTOR=Switch`

Then:

1. Create SAR 1.00 hosted charges for mada, card, and the wallet option.
2. Confirm 3DS redirects return to the order success URL.
3. Confirm Tap posts to `/api/public/webhooks/tap`.
4. Replay one valid signed webhook and confirm it is processed once.
5. Replay the same event and confirm the idempotency constraint prevents a
   second fulfillment.
6. Change one signed field and confirm the `hashstring` check rejects it.
7. Verify amount, currency, order reference, and provider payment ID match the
   stored payment row.

Never expose `TAP_SECRET_KEY` in Vite variables or browser bundles.

## 4. Private R2 explorer gate

1. Create `r2-explorer-bucket-preview` if it does not already exist.
2. Create a Cloudflare Access Self-hosted application linked directly to
   `switch-r2-explorer-preview`.
3. Add the Switch operations group as the only Allow policy.
4. Verify `workers_dev=false`, preview URLs are disabled, `readonly=true`,
   and `cors=false`.
5. Run both Wrangler dry-runs.
6. Deploy the preview environment only after Access is active.
7. Verify anonymous access is denied and an allowed identity can browse but
   cannot upload, edit, or delete.

Production continues to use `r2-explorer-bucket`; do not deploy that
environment during the staging gate.

## 5. Workers Observability MCP gate

The selected app is `apps/workers-observability`.

1. Replace the upstream account, route, KV, Vectorize, and Analytics Engine
   identifiers with Switch-owned staging resources.
2. Store `CLOUDFLARE_CLIENT_ID`, `CLOUDFLARE_CLIENT_SECRET`, and
   `MCP_COOKIE_ENCRYPTION_KEY` as Wrangler secrets.
3. Set the OAuth callback to the final staging hostname.
4. Validate consent, CSRF/state binding, exact redirect URI matching, token
   expiry, and scope display.
5. Connect MCP Inspector and verify `/mcp` and `/sse`.
6. Confirm only the intended Workers log, metric, account, and documentation
   tools are exposed.

Do not run the fork's existing upstream staging/production deploy commands.

## 6. Production go/no-go

A production merge and deployment may proceed only when all of these are true:

- Storefront GitHub quality gate is green.
- Vercel deployments are unblocked and the account can create a preview.
- Supabase staging migration and RLS assertions pass.
- Tap sandbox checkout, 3DS, webhook signature, replay, and fulfillment pass.
- Cloudflare Access denies anonymous R2 requests.
- Workers Observability OAuth and MCP Inspector checks pass.
- A human reviewer approves each repository diff and the pinned manifest.

Rollback is component-specific: revert the merge commit, roll back the Worker
version, and reverse database changes only through a new reviewed migration.
