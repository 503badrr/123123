# Switch Visual System v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing Cosmic/Neon storefront into a consistent premium Arabic-first commerce design and remove verified unused or duplicate repository content without touching payment, authentication, database, DNS, or deployment behavior.

**Architecture:** Keep the existing TanStack Start route structure and React components. Consolidate visual behavior through `src/styles.css` design tokens and focused shared components, then update storefront and admin surfaces without changing server contracts. Cleanup is evidence-driven: delete only files whose exported symbols and package imports have no consumers outside the candidate files.

**Tech Stack:** React 19, TanStack Start, TypeScript, Tailwind CSS v4, Vitest, Testing Library, Supabase, Cloudflare Workers.

## Global Constraints

- Work only on `design/switch-visual-system-v2`.
- Arabic and RTL remain the default.
- Preserve the Cosmic/Neon brand; reduce gradient usage to primary actions and highlights.
- Do not modify payment adapters, webhook routes, Supabase migrations, authentication authorization, DNS, `wrangler.jsonc`, or Cloudflare deployment settings.
- Keep `package-lock.json` and `npm ci` as the canonical install path.
- Delete a file only after repository search shows no consumer outside the deletion set.
- Touch targets must remain at least 44 CSS pixels where practical.
- Preserve visible keyboard focus and `prefers-reduced-motion` behavior.
- Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` before completion.

---

### Task 1: Record the cleanup evidence and remove duplicate package-manager state

**Files:**
- Create: `docs/audits/2026-08-03-visual-cleanup-inventory.md`
- Delete: `bun.lock`

**Interfaces:**
- Consumes: GitHub repository search results for lockfile and UI-symbol usage.
- Produces: An auditable deletion manifest used by every later cleanup task.

- [ ] **Step 1: Create the cleanup inventory**

Document the canonical package manager (`npm`), the CI command (`npm ci`), every deletion candidate, the searched symbol/import, and the result showing only self-references or references within the deletion set.

- [ ] **Step 2: Delete the duplicate Bun lockfile**

Delete `bun.lock`; keep `package-lock.json` unchanged until dependency removal in Task 2 regenerates it.

- [ ] **Step 3: Verify repository configuration**

Run:

```bash
npm ci
npm run typecheck
```

Expected: dependency installation and TypeScript validation pass using `package-lock.json` only.

- [ ] **Step 4: Commit**

```bash
git add docs/audits/2026-08-03-visual-cleanup-inventory.md bun.lock
git commit -m "chore: remove duplicate Bun lockfile"
```

### Task 2: Remove verified unused UI primitives and their exclusive dependencies

**Files:**
- Delete: `src/components/ui/alert-dialog.tsx`
- Delete: `src/components/ui/calendar.tsx`
- Delete: `src/components/ui/carousel.tsx`
- Delete: `src/components/ui/command.tsx`
- Delete: `src/components/ui/dialog.tsx`
- Delete: `src/components/ui/drawer.tsx`
- Delete: `src/components/ui/input-otp.tsx`
- Delete: `src/components/ui/pagination.tsx`
- Delete: `src/components/ui/resizable.tsx`
- Delete: `src/components/ui/sheet.tsx`
- Delete: `src/components/ui/sidebar.tsx`
- Delete: `src/components/ui/toggle-group.tsx`
- Delete: `src/components/ui/toggle.tsx`
- Delete: `src/components/ui/tooltip.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/audits/2026-08-03-visual-cleanup-inventory.md`

**Interfaces:**
- Consumes: Existing application imports and the cleanup evidence from Task 1.
- Produces: A smaller UI surface and dependency graph with no change to rendered routes.

- [ ] **Step 1: Re-run symbol searches before deletion**

Confirm these symbols occur only in their own files or in another file in this deletion set: `AlertDialogContent`, `CalendarDayButton`, `CarouselContent`, `CommandDialog`, `DialogContent`, `DrawerContent`, `InputOTPGroup`, `PaginationContent`, `ResizablePanelGroup`, `SheetContent`, `SidebarProvider`, `ToggleGroup`, `toggleVariants`, and `TooltipProvider`.

- [ ] **Step 2: Delete the unused files**

Remove the 14 files listed above in one cleanup commit.

- [ ] **Step 3: Remove exclusive dependencies**

Remove these packages from `package.json` and regenerate `package-lock.json` with `npm install --package-lock-only`:

```text
@radix-ui/react-alert-dialog
@radix-ui/react-dialog
@radix-ui/react-toggle
@radix-ui/react-toggle-group
cmdk
embla-carousel-react
input-otp
react-day-picker
react-resizable-panels
vaul
```

Keep shared packages such as `@radix-ui/react-slot`, `class-variance-authority`, and `lucide-react`.

- [ ] **Step 4: Verify the deletion set**

Run:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected: all commands pass and no deleted module is referenced.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json docs/audits/2026-08-03-visual-cleanup-inventory.md src/components/ui
git commit -m "chore(ui): remove unused template primitives"
```

### Task 3: Consolidate the visual tokens and reusable surface utilities

**Files:**
- Modify: `src/styles.css`
- Create: `src/components/SectionHeading.tsx`
- Create: `src/components/SectionHeading.test.tsx`

**Interfaces:**
- Produces: `SectionHeading({ eyebrow, title, description, action })` and shared classes for premium surfaces, buttons, status chips, and focus states.

- [ ] **Step 1: Write the failing component test**

Create a test that renders Arabic eyebrow/title/description content, verifies the heading relationship, and confirms an optional action remains keyboard accessible.

- [ ] **Step 2: Run the focused test**

```bash
npx vitest run src/components/SectionHeading.test.tsx
```

Expected: FAIL because `SectionHeading` does not exist.

- [ ] **Step 3: Implement `SectionHeading`**

Create a focused component using semantic `header`, `h2`, and optional action content without embedding route-specific behavior.

- [ ] **Step 4: Add visual tokens and utilities**

In `src/styles.css`, define restrained navy surfaces, cyan/blue primary emphasis, violet highlight, semantic success/warning/error colors, shared card borders, primary/secondary button treatments, status chips, and reduced-motion-safe hover transitions.

- [ ] **Step 5: Verify**

```bash
npx vitest run src/components/SectionHeading.test.tsx
npm run typecheck
npm run lint
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css src/components/SectionHeading.tsx src/components/SectionHeading.test.tsx
git commit -m "feat(design): add Switch visual system foundation"
```

### Task 4: Apply the system to global storefront chrome

**Files:**
- Modify: `src/components/AnnouncementBar.tsx`
- Modify: `src/components/SiteHeader.tsx`
- Modify: `src/components/SiteFooter.tsx`
- Modify: `src/components/BrandLogo.tsx`
- Create: `src/components/SiteHeader.test.tsx`

**Interfaces:**
- Consumes: visual utilities from Task 3.
- Produces: consistent global navigation and trust presentation without changing route destinations.

- [ ] **Step 1: Write header accessibility tests**

Verify the brand link, primary navigation labels, cart destination, authentication destination, and mobile-menu button accessible name.

- [ ] **Step 2: Run the focused test**

```bash
npx vitest run src/components/SiteHeader.test.tsx
```

Expected: at least one assertion fails against the current header markup.

- [ ] **Step 3: Refine global chrome**

Apply the restrained surface system, 44px touch targets, visible focus rings, consistent icon treatment, and clearer Arabic labels. Preserve existing routes and cart behavior.

- [ ] **Step 4: Verify**

```bash
npx vitest run src/components/SiteHeader.test.tsx
npm run typecheck
npm run lint
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnnouncementBar.tsx src/components/SiteHeader.tsx src/components/SiteFooter.tsx src/components/BrandLogo.tsx src/components/SiteHeader.test.tsx
git commit -m "feat(design): refine storefront navigation and trust chrome"
```

### Task 5: Standardize home, catalog, and product presentation

**Files:**
- Modify: `src/routes/index.tsx`
- Modify: `src/routes/catalog.tsx`
- Modify: `src/routes/item.$id.tsx`
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/components/CategoryBanners.tsx`
- Modify: `src/components/PageHero.tsx`
- Modify: `src/components/ProductCard.test.tsx`

**Interfaces:**
- Consumes: `SectionHeading` and shared visual utilities.
- Produces: consistent section hierarchy, product cards, category artwork treatment, empty results, and purchase actions.

- [ ] **Step 1: Extend product-card tests**

Assert product name, current price, optional old price, product link, focusable card action, and accessible discount/tag text.

- [ ] **Step 2: Run focused tests**

```bash
npx vitest run src/components/ProductCard.test.tsx
```

Expected: new assertions fail before markup refinement.

- [ ] **Step 3: Implement presentation updates**

Use restrained cards, square artwork framing, clearer price hierarchy, semantic badges, reusable section headings, and responsive 320px layouts. Preserve product data and route parameters.

- [ ] **Step 4: Verify**

```bash
npx vitest run src/components/ProductCard.test.tsx
npm run typecheck
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx src/routes/catalog.tsx 'src/routes/item.$id.tsx' src/components/ProductCard.tsx src/components/CategoryBanners.tsx src/components/PageHero.tsx src/components/ProductCard.test.tsx
git commit -m "feat(storefront): standardize discovery and product presentation"
```

### Task 6: Standardize cart, checkout, and order-state communication

**Files:**
- Modify: `src/routes/cart.tsx`
- Modify: `src/routes/checkout.tsx`
- Modify: `src/routes/success.tsx`
- Modify: `src/store/cart.test.tsx`

**Interfaces:**
- Preserves: cart state API, hosted-checkout server function, and server-owned payment status.
- Produces: clearer summaries, payment handoff copy, pending/success/failure distinction, and mobile-safe actions.

- [ ] **Step 1: Add copy and interaction assertions**

Verify quantity controls have product-specific accessible names, checkout copy describes a secure handoff, and the return page does not claim confirmed delivery while the order remains pending.

- [ ] **Step 2: Run focused tests**

```bash
npx vitest run src/store/cart.test.tsx
```

Expected: any newly introduced UI assertions fail before implementation.

- [ ] **Step 3: Implement visual and copy changes**

Use the shared card/button/status system, keep the order summary sticky on large screens, preserve server calls, and show explicit pending/confirmed/failed status language.

- [ ] **Step 4: Verify**

```bash
npx vitest run src/store/cart.test.tsx
npm run typecheck
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/cart.tsx src/routes/checkout.tsx src/routes/success.tsx src/store/cart.test.tsx
git commit -m "feat(checkout): clarify cart and payment status experience"
```

### Task 7: Apply the system to the administration shell

**Files:**
- Modify: `src/components/AdminLayout.tsx`
- Modify: `src/routes/admin.index.tsx`
- Modify: `src/routes/admin.owner.tsx`
- Modify: `src/routes/admin.analytics.tsx`
- Modify: `src/routes/admin.finance.tsx`
- Modify: `src/routes/admin.security.tsx`
- Modify: `src/routes/admin.staff.tsx`
- Modify: `src/routes/admin.integrations.tsx`
- Modify: `src/routes/admin.codes.tsx`
- Create: `src/components/AdminLayout.test.tsx`

**Interfaces:**
- Preserves: existing admin route authorization and data-loading contracts.
- Produces: consistent navigation, KPI cards, status badges, tables, filters, and destructive-action styling.

- [ ] **Step 1: Write admin-shell tests**

Assert the owner, staff, analytics, finance, security, integrations, and codes destinations are present with visible active/focus states and semantic navigation labeling.

- [ ] **Step 2: Run the focused test**

```bash
npx vitest run src/components/AdminLayout.test.tsx
```

Expected: at least one assertion fails before refinement.

- [ ] **Step 3: Implement admin consistency changes**

Apply shared surfaces and status colors, improve table overflow on narrow screens, standardize KPI hierarchy, and retain all existing loaders, server functions, and authorization checks.

- [ ] **Step 4: Verify**

```bash
npx vitest run src/components/AdminLayout.test.tsx
npm run typecheck
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminLayout.tsx src/components/AdminLayout.test.tsx src/routes/admin*.tsx
git commit -m "feat(admin): unify Switch administration surfaces"
```

### Task 8: Final verification and pull request

**Files:**
- Modify: `docs/audits/2026-08-03-visual-cleanup-inventory.md`

**Interfaces:**
- Produces: final test evidence and a reviewable pull request.

- [ ] **Step 1: Run the complete quality gate**

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected: all commands pass.

- [ ] **Step 2: Review the aggregate diff**

Confirm no payment adapter, webhook route, Supabase migration, auth policy, DNS file, or Cloudflare deployment file changed.

- [ ] **Step 3: Finalize deletion evidence**

Record every deleted file and dependency, search evidence, and quality-gate result in the cleanup inventory.

- [ ] **Step 4: Open the pull request**

Title:

```text
feat(design): launch Switch visual system v2 and remove unused UI
```

The body must include visual scope, deleted files/dependencies, verification commands, protected areas left unchanged, and manual mobile/desktop review items.