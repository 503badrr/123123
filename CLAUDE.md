# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Switch (سويتش)** is an Arabic e-commerce platform for digital products (games, cards, subscriptions, offers). Built with TanStack Start (full-stack React framework), it features a pluggable payment provider system, role-based access control, and sophisticated inventory management for digital codes.

**Key Constraint**: This repository is the single source of truth (standalone — no longer Lovable-managed). Never force-push, rebase, amend, or squash published commits. Keep the default branch in a working state — every merge deploys via the connected hosting.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Radix UI)
- **Framework**: TanStack Start (full-stack) with TanStack Router (file-based routing)
- **Backend**: Supabase (standalone project) with PostgreSQL
- **Forms**: React Hook Form + Zod validation
- **State Management**: TanStack React Query
- **Build**: Vite 8 + nitro (`cloudflare-module` preset); deployed to Cloudflare Worker `dark-disk-4155` from this repo
- **Package Manager**: Bun (preferred) or npm

## Getting Started

### Development Commands

```bash
# Start dev server (HMR enabled)
npm run dev  # or: bun dev

# Build for production
npm run build

# Development build (source maps, easier debugging)
npm run build:dev

# Preview production build locally
npm run preview

# Lint with ESLint
npm run lint

# Format code with Prettier
npm run format
```

**Environment Setup**: Copy `.env.example` to `.env` and fill in credentials for local development (including payment provider sandbox keys, as the payment adapters read from `process.env` and refuse to run without them). `.env` is git-ignored. For production, set all secrets in the Cloudflare Worker settings and build variables — never commit real keys.

## Architecture

### Routing & Pages (src/routes/)

File-based routing via TanStack Router. Three main categories:

1. **Public Routes**: Home (`index.tsx`), Catalog, Product Detail (`item.$id.tsx`), Cart, Checkout, Auth
2. **Protected Routes** (`_authenticated/`): Account, Orders, Wallet
3. **Admin Routes** (`admin.*`): Owner/Staff panels, Analytics, Finance, Security, Digital Code upload/management

**Layouts**:
- `__root.tsx` — Root layout with header, footer, SEO metadata
- `_authenticated/route.tsx` — Auth guard redirects to `/auth` if no session
- `admin.tsx` — Role-based admin redirect

### Server Functions (src/lib/)

TanStack Start's `createServerFn` pattern handles backend logic. All run on the server; input/output validated with Zod.

**Key files**:
- `products.functions.ts` — Public product queries (no secrets exposed)
- `orders.functions.ts` — Order placement (server-calculated prices, atomic code reservation)
- `account.functions.ts` — User account, wallet, notifications
- `admin.functions.ts` — Owner/staff operations, CSV code import, auditing

**Pattern**:
```typescript
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const myFunction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ /* schema */ }).parse(d))
  .handler(async ({ data }) => {
    // Server code here; has access to env vars, service role key, etc.
    return result;
  });
```

Client calls via: `const result = await myFunction({ arg: value })` — no fetch boilerplate needed.

### Database & Security (Supabase)

- **RLS (Row-Level Security)**: Strict policies on all tables. Public products readable by all; user data readable only by owner.
- **RBAC (Role-Based Access Control)**: `user_roles` table + `has_role()` SQL function (Security Definer) prevent client-side tampering.
- **Tables**: `profiles`, `products`, `categories`, `orders`, `order_items`, `digital_codes`, `payments`, `wallet*`, `notifications`, `audit_logs`, `webhook_events`.

**Digital Codes State Machine**: `AVAILABLE → RESERVED → DELIVERED` with `FOR UPDATE SKIP LOCKED` to prevent double-use.

**Payment Webhooks**: All stored in `webhook_events` for idempotency (prevent processing same webhook twice).

### Payment System (src/server/payments/)

Pluggable provider architecture. Switch at runtime via `PAYMENT_PROVIDER` env var.

**Providers** (each in `*.server.ts`):
- `moyasar.server.ts` — Moyasar (Saudi Arabia)
- `hyperpay.server.ts` — HyperPay (CopyandPAY)
- `tap.server.ts` — Tap Payments

**Webhook handlers** in `src/routes/api/public/webhooks/`:
- `moyasar.ts`, `hyperpay.ts`, `tap.ts` — Verify HMAC signature, check idempotency, update payment status

**Keys**: All kept server-side in env vars (read via `process.env.*` in `*.server.ts` files only). Never exposed to browser.

### Components (src/components/)

- `ui/` — shadcn/ui primitives (button, dialog, form, input, etc.). **Don't modify these**—they're generated from Radix UI.
- `AdminLayout.tsx` — Admin sidebar/nav
- `SiteHeader.tsx`, `SiteFooter.tsx` — Global chrome
- `ProductCard.tsx` — Product grid card

### Integrations

- `integrations/supabase/` — Client initialization, types, auth middleware

### Data & Store

- `data/products.ts`, `data/admin.ts` — Static/mock data (used for catalog structure)
- `store/` — If used, would contain client-side state (currently minimal)

### Hooks

- `hooks/use-mobile.tsx` — Responsive breakpoint hook

## Validation & Error Handling

**Input Validation**: Always use Zod in server function validators. Example:
```typescript
.inputValidator((d: unknown) => 
  z.object({ 
    email: z.string().email(),
    amount: z.number().positive(),
  }).parse(d)
)
```

**Error Responses**: Throw `Error` with user-friendly messages; TanStack catches and returns to client.

**Error Boundary**: `src/lib/error-page.ts` renders the SSR error page; `src/server.ts` wraps the server entry to catch catastrophic SSR failures.

## Database Naming Conventions

- Tables: snake_case (e.g., `digital_codes`, `order_items`)
- Columns: snake_case (e.g., `created_at`, `user_id`)
- Enums: lowercase (e.g., `"available" | "reserved" | "delivered"`)

## Import Aliases

- `@/*` → `src/*` (configured in `tsconfig.json`)

Use `@/components/ui/button` instead of `../../components/ui/button`.

## Configuration Files

- `vite.config.ts` — standalone config: Tailwind v4, tsconfig paths, TanStack Start (server entry: `src/server.ts`), nitro `cloudflare-module` build, React dedupe
- `tsconfig.json` — Strict mode enabled; target ES2022
- `eslint.config.js` — ESLint 9 flat config; no Prettier conflicts
- `.prettierrc` — Double quotes, 2-space indent, `printWidth: 100`, trailing commas
- `components.json` — shadcn/ui config (for CLI code generation)
- `bunfig.toml` — Bun package manager config (if using Bun)

## Common Workflows

### Adding a Product Type
1. Update `Product` type in `src/integrations/supabase/types.ts`
2. Add enum option to `kind` field in database schema
3. Update product filters in `products.functions.ts`
4. Add route/page in `src/routes/` (e.g., `src/routes/newtype.tsx`)

### Adding an Admin Panel Section
1. Create route: `src/routes/admin.newsection.tsx`
2. Check user role in server function or layout (`_authenticated/route.tsx`)
3. Use `AdminLayout.tsx` for consistent sidebar
4. Call admin server functions from `admin.functions.ts`

### Switching Payment Providers
1. Set `PAYMENT_PROVIDER=telr|tap` (hosted redirect currently supports these) in the hosting env vars
2. Webhook URLs in payment dashboard must match: `https://yourdomain.com/api/public/webhooks/{provider}`
3. No code changes needed (abstraction handles routing)

### Handling Webhook Idempotency
1. Webhook handlers check `webhook_events` table for `(provider, event_id)` combo (see `src/routes/api/public/webhooks/*.ts`)
2. If exists, return 200 (don't re-process)
3. If new, insert event, process, mark as handled

### Deploying
1. Cloudflare Workers Builds auto-deploys production from the connected `main` branch
2. SSL is auto-provisioned after the custom domain is attached to the Worker
3. Database migrations applied to the standalone Supabase project (SQL editor or `supabase db push`)
4. Production secrets (API keys) set in the hosting dashboard; local `.env` is fine for dev sandbox keys but **never commit** them

## Code Style

- **Formatting**: Prettier (2-space indent, double quotes, trailing commas, `printWidth: 100`)
- **Linting**: ESLint with React rules
- **TypeScript**: Strict mode; always define return types for functions
- **Components**: Functional (hooks-based); no class components
- **Naming**: camelCase for functions/variables, PascalCase for components
- **Comments**: Minimal; self-documenting code preferred. Add only for non-obvious logic.

## Testing & Debugging

- No test suite currently configured; CI enforces typecheck + lint + build (NodeJS Quality Gate workflow)
- Browser DevTools: Server function calls visible in Network tab under `/api/` endpoints
- SSR Errors: Check browser console and the hosting provider's function logs
- Environment check: Print `process.env.PAYMENT_PROVIDER` server-side to verify config loaded

## SEO & Static Generation

- `sitemap[.]xml.ts` — Dynamic sitemap including all active products
- `robots.txt` — Excludes sensitive paths (`/admin`, `/account`), references sitemap
- Meta tags in `__root.tsx` — Open Graph, descriptions per route

## Important Notes

1. **Never commit real API keys** — use `.env` locally, hosting dashboard secrets for production
2. **Server functions are safe** — env vars, service role key available only server-side, never in browser bundle
3. **RLS is enforced** — database policies prevent unauthorized row access regardless of client code
4. **Git history is authoritative** — don't rewrite published history; the default branch is the deployment source of truth
5. **Cost awareness** — each server function call hits Supabase; optimize queries (batch requests, pagination)
6. **Timezone handling** — all timestamps stored in UTC; format client-side with `date-fns` and user locale
