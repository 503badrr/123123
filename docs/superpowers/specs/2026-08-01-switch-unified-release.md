# Switch Unified Release Design

**Date:** 2026-08-01  
**Release branch:** `release/switch-unified-2026-08-01`  
**Repositories:**

- `503badrr/cosmic-switch-preview`
- `503badrr/r2-explorer-template`
- `503badrr/mcp-server-cloudflare`

## Goal

Ship the three repositories as one traceable Switch release while keeping checkout, payment confirmation, and digital fulfilment independent from the availability of the R2 Explorer and MCP operations services.

## Architecture

The repositories remain independent deployable services. A release manifest in the storefront repository pins the exact commit SHA for each repository and a central workflow validates all three before production promotion.

- **Storefront:** owns authentication, checkout, Tap integration, webhook verification, orders, payment state, digital-code fulfilment, and the customer/admin UI.
- **R2 Explorer:** private operational UI for bucket administration. It is never called by checkout or payment webhook code.
- **Switch MCP:** narrowly selected Cloudflare operational capabilities. The entire upstream monorepo is not deployed as one Switch service.
- **Supabase:** system of record for users, orders, order items, payments, webhook idempotency, fulfilment, and audit events.
- **Cloudflare R2:** object storage only. It does not replace the transactional order or digital-code database.

## Non-negotiable invariants

1. Checkout and Tap webhook handling continue when R2 Explorer or MCP is unavailable.
2. A browser redirect is not proof of payment. Only a verified provider webhook or server-side provider lookup may finalize payment.
3. `SUPABASE_SERVICE_ROLE_KEY`, Tap secret keys, Cloudflare API tokens, OAuth secrets, and R2 credentials are server-only.
4. No production workflow executes destructive SQL automatically.
5. Applied Supabase migrations are immutable. Drift is repaired with a new migration.
6. Managed `auth`, `storage`, `extensions`, and Supabase internal roles are not modified to silence access errors.
7. `order_items` retains `order_id`, `product_id`, `product_name`, `quantity`, and `unit_price`.
8. Every production release records and validates the three repository SHAs before promotion.
9. R2 Explorer and MCP require private authentication and least-privilege Cloudflare permissions.
10. Production rollback restores the previous three-SHA manifest without reversing database migrations automatically.

## Supabase corrective release

Create a new migration through `supabase migration new` and validate it against an isolated database or Supabase branch before production.

The corrective migration must:

- Revoke `EXECUTE` on `public.is_admin()` from `PUBLIC` and `anon`.
- Grant `EXECUTE` on `public.is_admin()` to `authenticated` and `service_role`.
- Preserve the current `SECURITY DEFINER` body only while it keeps `search_path = ''`, fully qualifies `public.profiles`, derives identity from `auth.uid()`, and returns a boolean.
- Recreate every policy that calls `public.is_admin()` with an explicit `TO authenticated` role and the existing ownership/admin predicate.
- Keep `contact_messages` and `rate_limits` service-only unless a product requirement explicitly introduces client access.
- Drop redundant indexes `webhook_events_id_idx`, `webhook_events_id_idx1`, `webhook_events_id_idx2`, `webhook_events_id_idx3`, `webhook_events_id_idx4`, and redundant `idx_webhook_events_provider_event_id`.
- Preserve `webhook_events_pkey`, `webhook_events_provider_event_id_key`, and `idx_webhook_events_processed`.
- Leave public read access to active `products` and `site_banners` because the storefront requires it; RLS continues to restrict mutation.
- Add an RLS verification matrix for `anon`, customer, staff/admin, and `service_role`.
- Regenerate TypeScript types after the schema is verified.

Leaked-password protection is enabled from Supabase Auth settings and verified separately; it is not represented as arbitrary SQL.

## Tap payment contract

The Tap adapter will keep the existing HMAC-SHA256 `hashstring` validation and constant-time comparison. The release adds:

- A Tap-specific customer mapper producing `first_name`, `last_name`, `email`, and `phone: { country_code, number }`.
- Explicit `threeDSecure`, `save_card`, language, redirect, and post URL fields.
- A documented payment-source strategy. `src_all` is used only when intentionally accepting every enabled method.
- Provider response validation requiring a non-empty Tap ID and hosted redirect URL when the response is pending.
- Webhook tests for valid charge, valid authorization, invalid signature, malformed amount, amount/currency mismatch, replay, and unsupported status.
- Status pages that poll server-owned order state and never trust query parameters as a successful payment result.
- Sanitized logs that exclude secrets, full card data, customer email, phone, and delivered digital codes.

## Digital fulfilment

The atomic `switch_process_payment_webhook` RPC remains the single fulfilment boundary. It must preserve idempotency through `(provider, event_id)`, lock available codes with `FOR UPDATE SKIP LOCKED`, validate amount and currency, and return a minimal delivery result.

The `code_ciphertext` column must not be presented as encrypted unless ciphertext encryption is actually implemented. The release either introduces authenticated server-side encryption/decryption with key rotation or renames and treats the field as sensitive plaintext with strict service-only access. Raw codes must never be sent to client-side admin list endpoints without an explicit reveal action and audit event.

## Private R2 Explorer

- Replace `r2-explorer-template` and `r2-explorer-bucket` placeholder names.
- Use separate preview and production buckets.
- Keep `readonly: true` until Cloudflare Access is configured and unauthorized requests are proven denied.
- After Access verification, allow writes only to the administrator group and retain audit logs.
- Use a dedicated hostname such as `files-admin.swwiitch.com`.
- Do not expose the Worker through a public route that bypasses Access.

## Switch MCP

The upstream monorepo is treated as a source collection, not as one deployable Switch service.

- Select only the operational server required for the first release, initially observability or audit logs.
- Remove or disable development token bypasses in production configuration.
- Use OAuth and scoped Cloudflare API permissions.
- Do not place Supabase service-role credentials in MCP.
- Do not allow MCP availability to influence checkout, webhook acknowledgement, or fulfilment.
- Fix the root type pipeline so every package invoked by `pnpm types` has a valid Wrangler configuration or a TypeScript-only type script.

## Unified release contract

The storefront repository owns:

- `release/switch-unified.json`: release ID, environment, three repository SHAs, Supabase migration head, and expected deployment names.
- `scripts/verify-unified-release.mjs`: schema validation for the manifest and GitHub SHA existence checks.
- `.github/workflows/unified-release.yml`: validation and staged promotion.
- A release report containing test evidence and rollback SHAs.

Promotion order:

1. Validate manifest and immutable SHAs.
2. Run storefront quality gate and payment/RLS tests.
3. Run R2 TypeScript and Wrangler dry-run.
4. Run the selected MCP package tests, types, and Wrangler dry-run.
5. Validate the Supabase migration in isolation.
6. Deploy private operational services to staging.
7. Deploy storefront to staging.
8. Run unauthorized-access, webhook, checkout, and fulfilment smoke tests.
9. Promote operational services, then storefront.
10. Record deployment URLs and the three-SHA release tag.

## Admin infrastructure UI

Add a private RTL route under the existing admin layout. It contains:

- Current unified release ID and repository SHAs.
- Storefront, Supabase, R2 Explorer, and MCP health cards.
- Supabase migration-drift and advisor summaries.
- Links to private Cloudflare dashboards rather than embedded credentials.
- No general SQL editor.
- Explicit confirmation for destructive actions.
- Server-side authorization for every data request; hiding a navigation item is not authorization.

The UI follows the existing dark Switch design system, responsive layout, WCAG AA contrast, visible focus states, Arabic-first copy, and reduced-motion support.

## Verification and rollback

Required release evidence:

- Storefront: `npm ci`, typecheck, lint, full tests, build, Wrangler dry-run.
- Tap: fixture tests covering charge and authorization payloads and signature failures.
- Supabase: advisors before and after, RLS role matrix, migration list, and generated types diff.
- R2: TypeScript, dry-run, Access denial without identity, authenticated read, and authorized write after write mode is enabled.
- MCP: dependency consistency, formatting, types, tests, selected app dry-run, OAuth denial, and least-privilege token test.
- End to end: one SAR sandbox checkout, replayed webhook, amount mismatch, missing inventory, and dependency outage tests.

Rollback restores the previous application deployments and three-SHA manifest. Database migrations must be forward-fixed unless a separately reviewed reversible migration exists.
