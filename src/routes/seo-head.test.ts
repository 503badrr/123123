import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalPathFor, robotsContentFor } from "../lib/seo";

const readRoute = (name: string) =>
  readFileSync(join(process.cwd(), "src", "routes", name), "utf8");

describe("public route SEO metadata", () => {
  it("does not force the homepage canonical from the root layout", () => {
    const root = readRoute("__root.tsx");

    expect(root).not.toContain(
      '{ rel: "canonical", href: productionConfig.siteUrl }',
    );
  });

  it("gives indexable storefront pages their own canonical path", () => {
    const indexablePaths = [
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
    ];

    for (const path of indexablePaths) {
      expect(canonicalPathFor(path)).toBe(path);
      expect(robotsContentFor(path)).toBe("index, follow");
    }
  });

  it("does not add a second root canonical to self-managed or private routes", () => {
    const excludedPaths = [
      "/item/fifa-points",
      "/privacy",
      "/terms",
      "/cart",
      "/checkout",
      "/auth",
      "/reset-password",
      "/success",
      "/account",
      "/orders",
      "/wallet",
      "/admin",
      "/admin/finance",
    ];

    for (const path of excludedPaths) {
      expect(canonicalPathFor(path)).toBeUndefined();
    }
  });

  it("marks transactional and private routes noindex centrally", () => {
    for (const path of [
      "/cart",
      "/checkout",
      "/auth",
      "/reset-password",
      "/success",
      "/account",
      "/orders",
      "/wallet",
      "/admin",
      "/admin/finance",
    ]) {
      expect(robotsContentFor(path)).toBe("noindex, nofollow");
    }
  });

  it("wires canonical and robots helpers into the root head", () => {
    const root = readRoute("__root.tsx");

    expect(root).toContain("canonicalPathFor");
    expect(root).toContain("robotsContentFor");
    expect(root).toContain('rel: "canonical"');
    expect(root).toContain("absoluteUrl(canonicalPath)");
    expect(root).toContain('name: "robots"');
  });

  it("keeps only indexable storefront pages in the static sitemap", () => {
    const sitemap = readRoute("sitemap[.]xml.ts");

    expect(sitemap).toContain('{ path: "/contact"');
    expect(sitemap).toContain('{ path: "/faq"');
    expect(sitemap).not.toContain('{ path: "/cart"');
    expect(sitemap).not.toContain('{ path: "/checkout"');
    expect(sitemap).not.toContain('{ path: "/auth"');
  });
});
