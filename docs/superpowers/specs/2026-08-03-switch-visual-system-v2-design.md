# Switch Visual System v2 and Safe Cleanup Design

**Date:** 2026-08-03  
**Branch:** `design/switch-visual-system-v2`

## Goal

Upgrade the existing Switch storefront and administration interface into a consistent premium Arabic-first digital-commerce system while removing only code, files, dependencies, and assets that are demonstrably unused, duplicated, or obsolete.

## Scope

This release covers the visual-system foundation, storefront consistency, administration consistency, accessibility, performance-sensitive styling, and repository cleanup.

It does **not** change payment-provider behavior, webhook verification, order fulfilment, Supabase schema, authentication authorization, production DNS, or Cloudflare deployment settings.

## Visual direction

The current Cosmic/Neon identity is preserved and refined rather than replaced.

- Primary background: deep navy/space.
- Surface background: translucent blue-navy.
- Primary accent: electric cyan.
- Secondary accent: royal blue.
- Limited highlight: violet/magenta.
- Success: emerald.
- Warning: amber.
- Error: rose-red.
- Text: snow white and blue-gray.

Neon gradients are reserved for the logo, primary actions, active navigation, and promotional highlights. Standard content surfaces use restrained borders and shadows to improve readability and perceived trust.

## Design-system rules

1. Arabic and RTL are the default.
2. Interactive targets are at least 44 CSS pixels on touch surfaces.
3. Focus states remain visible for keyboard users.
4. Text contrast targets WCAG AA.
5. Motion respects `prefers-reduced-motion`.
6. Core copy remains real HTML; decorative artwork must not contain required product or legal text.
7. Product artwork uses consistent square framing; promotional artwork uses 16:9 where possible.
8. Buttons, cards, badges, section headings, empty states, and admin tables share consistent radii, borders, spacing, and status colors.
9. Payment success is never claimed before the server-owned order state confirms it.
10. Mobile layouts are designed from 320px upward and remain usable on large desktop screens.

## Storefront areas

- Global announcement bar, header, navigation, mobile menu, and footer.
- Home hero, category sections, trust content, product sections, and calls to action.
- Catalog filters and result states.
- Product cards and product detail layout.
- Cart and checkout presentation.
- Payment pending, success, failure, and order-status communication.
- Account, orders, wallet, support, and empty states.

## Administration areas

- Shared admin shell and navigation.
- Owner overview, analytics, finance, security, staff, integrations, and digital-code management.
- Consistent KPI cards, tables, status badges, filters, empty states, and destructive-action affordances.
- Server-side authorization remains authoritative; hidden navigation is not treated as access control.

## Cleanup policy

A file or dependency may be deleted only when at least one of the following is proven:

1. It has no imports, route registration, script reference, documentation reference, or runtime lookup.
2. It duplicates a canonical file and the repository has one documented source of truth.
3. It belongs exclusively to a retired tool or deployment path and no active workflow consumes it.
4. It is a generated artifact that is recreated deterministically and should not be committed.

Before deletion, search the repository for the filename, exported symbols, package import, script name, and public URL.

The following are protected unless separately proven safe:

- Payment adapters and webhook routes.
- Supabase migrations and generated database types.
- Authentication middleware and protected routes.
- Legal pages and sitemap entries.
- Brand source artwork used for marketing even when it is not rendered directly in the application.
- Cloudflare deployment files while the deployment-unification pull request remains open.

## Package-manager policy

`npm` and `package-lock.json` are the canonical install path because CI uses `npm ci`. A second lockfile is considered duplicate unless an active workflow or documented contributor path requires it.

## Verification

Every implementation batch must pass:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

For deployment-related files, also run the existing Cloudflare dry-run gate from the deployment branch rather than changing those files in this design branch.

## Delivery

Changes are delivered through a dedicated pull request. The pull request must list every deleted file and dependency with the evidence used to classify it as unused, duplicated, or obsolete.