const ROOT_CANONICAL_PATHS = new Set([
  "/",
  "/catalog",
  "/games",
  "/cards",
  "/subscriptions",
  "/offers",
  "/about",
  "/contact",
  "/faq",
  "/refund-policy",
  "/digital-delivery",
]);

const NOINDEX_PATHS = new Set([
  "/cart",
  "/checkout",
  "/auth",
  "/reset-password",
  "/success",
  "/account",
  "/orders",
  "/wallet",
]);

/**
 * Returns a canonical path only for indexable public routes that currently
 * rely on root-level SEO metadata. Routes with their own SEO (for example
 * item, privacy, and terms pages) and private/transactional routes
 * intentionally return undefined so they cannot receive a second canonical.
 */
export function canonicalPathFor(pathname: string | undefined) {
  if (!pathname) return undefined;

  return ROOT_CANONICAL_PATHS.has(pathname) ? pathname : undefined;
}

/**
 * Private, authentication, checkout, and post-payment routes should never
 * compete with storefront pages in search results. Admin descendants are
 * covered by prefix so future admin pages inherit the same safe default.
 */
export function robotsContentFor(pathname: string | undefined) {
  if (!pathname) return "index, follow";

  if (NOINDEX_PATHS.has(pathname) || pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "noindex, nofollow";
  }

  return "index, follow";
}
