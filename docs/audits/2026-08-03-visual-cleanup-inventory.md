# Switch Visual Cleanup Inventory

**Date:** 2026-08-03  
**Branch:** `design/switch-visual-system-v2`  
**Pull request:** `#31`

## Rules

- `npm` is the canonical package manager because the repository quality gate installs with `npm ci`.
- `package-lock.json` remains the canonical lockfile.
- A source file is deleted only when its exported-symbol and import searches return the file itself or another file in the same deletion set.
- Payment, authentication, Supabase, legal, DNS, and Cloudflare deployment files are protected from this cleanup.
- Public brand artwork is retained even when not rendered directly because it remains useful for marketing and social-media production.

## Completed duplicate cleanup

| Deleted item | Evidence | Result |
| --- | --- | --- |
| `bun.lock` | CI and repository scripts use npm; `package-lock.json` is the active deterministic lockfile. | Removed duplicate package-manager state. |

## Completed unused UI cleanup

| Deleted file | Search evidence | Removed exclusive dependency |
| --- | --- | --- |
| `src/components/ui/alert-dialog.tsx` | `AlertDialogContent` resolved only to this file. | `@radix-ui/react-alert-dialog` |
| `src/components/ui/calendar.tsx` | `CalendarDayButton` resolved only to this file. | `react-day-picker` |
| `src/components/ui/carousel.tsx` | `CarouselContent` resolved only to this file. | `embla-carousel-react` |
| `src/components/ui/command.tsx` | `CommandDialog` resolved only to this file. | `cmdk` |
| `src/components/ui/dialog.tsx` | `DialogContent` resolved only to this file and files in this deletion set. | `@radix-ui/react-dialog` |
| `src/components/ui/drawer.tsx` | `DrawerContent` resolved only to this file. | `vaul` |
| `src/components/ui/input-otp.tsx` | `InputOTPGroup` resolved only to this file. | `input-otp` |
| `src/components/ui/pagination.tsx` | `PaginationContent` resolved only to this file. | none exclusive |
| `src/components/ui/resizable.tsx` | `ResizablePanelGroup` resolved only to this file. | `react-resizable-panels` |
| `src/components/ui/sheet.tsx` | `SheetContent` resolved only to this file and `sidebar.tsx`. | shared `@radix-ui/react-dialog` inside deletion set |
| `src/components/ui/sidebar.tsx` | `SidebarProvider` resolved only to this file. | none exclusive |
| `src/components/ui/toggle-group.tsx` | `ToggleGroup` resolved only to this file. | `@radix-ui/react-toggle-group` |
| `src/components/ui/toggle.tsx` | `toggleVariants` resolved only to this file and `toggle-group.tsx`. | `@radix-ui/react-toggle` |
| `src/components/ui/tooltip.tsx` | `TooltipProvider` resolved only to this file and `sidebar.tsx`. | `@radix-ui/react-tooltip` |

Additional packages removed because they were consumed only by the deleted files:

- `input-otp`
- `cmdk`
- `embla-carousel-react`
- `react-day-picker`
- `react-resizable-panels`
- `vaul`

`package-lock.json` was regenerated after dependency removal. The temporary lockfile-refresh workflow was deleted and does not appear in the pull-request diff.

## Retained candidates

Select, dropdown menu, checkbox, tabs, form, accordion, and other Radix wrappers remain because their route-level consumers were not classified as unused. No broad deletion was performed based solely on filenames or visual similarity.

## Visual-system implementation

The cleanup branch also introduced the approved Switch Visual System v2 without changing business or server contracts:

- Shared restrained navy/cyan surfaces, buttons, status colors, focus states, and reduced-motion behavior.
- Reusable accessible `SectionHeading` component.
- Refined announcement bar, header, mobile navigation, footer, home, catalog, categories, page heroes, and product cards.
- Unified cart, checkout, and payment-return presentation while preserving hosted checkout and server-owned payment confirmation.
- Unified administration navigation and restored the existing `/admin/codes` destination to the visible admin menu.

## Test-driven evidence

The following contracts were written before their implementations and failed for the intended reason before passing:

1. `SectionHeading` test failed because the component did not exist, then passed after semantic implementation.
2. Header navigation test failed because the mobile menu button lacked `aria-controls`, then passed after binding it to `switch-mobile-menu`.
3. Product-card test failed because the product name was not an `h3`, then passed after semantic card markup.
4. Admin-layout test failed because the navigation lacked an accessible name and the digital-codes destination was absent, then passed after the navigation update.

## Protected-area review

The final changed-file list contains no files under or matching:

- `src/server/payments/`
- `src/routes/api/public/webhooks/`
- `supabase/`
- authentication middleware or authorization policies
- `wrangler.jsonc`
- Cloudflare deployment configuration
- DNS/domain configuration
- legal pages

The payment-return page continues to state that returning from the payment gateway alone is not proof of a successful charge or completed delivery.

## Final verification

GitHub Actions quality gate **run #239** succeeded on Node.js 22 for commit `fd7f399c2cc2267247ac96280840e82c0e4dd357`:

- `npm ci` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed with warnings and zero errors
- `npm run test` — passed
- `npm run build` — passed

## Non-blocking follow-up findings

These existing ecosystem findings are not silently bundled into the visual-design pull request:

- `npm ci` reports two high-severity dependency advisories that require a separate dependency/security review.
- `recharts@2.15.4` reports a deprecation notice because the v1/v2 line is inactive; a major-version upgrade requires isolated chart regression testing.
- `vite-tsconfig-paths` reports that current Vite versions provide native tsconfig path support; removal should be handled in a focused build-config change.
- ESLint completes with zero errors and 42 warnings, primarily pre-existing `any` and fast-refresh warnings.
- The connected Vercel status remains an account/integration failure and is not used as evidence for the Cloudflare-targeted code quality result.

## Status

- Cleanup complete.
- Visual-system implementation complete for the scoped storefront and administration surfaces.
- Full automated quality gate passed.
- Pull request remains draft pending manual visual smoke review on mobile and desktop.
- Branch is not merged into `main`.