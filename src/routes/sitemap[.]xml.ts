import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = process.env.PUBLIC_SITE_URL ?? "https://swwiitch.com";

interface SitemapEntry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/catalog", changefreq: "daily", priority: "0.9" },
          { path: "/games", changefreq: "daily", priority: "0.9" },
          { path: "/cards", changefreq: "daily", priority: "0.9" },
          { path: "/subscriptions", changefreq: "daily", priority: "0.9" },
          { path: "/offers", changefreq: "daily", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/faq", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "monthly", priority: "0.5" },
          { path: "/terms", changefreq: "monthly", priority: "0.5" },
          { path: "/refund-policy", changefreq: "monthly", priority: "0.5" },
          { path: "/digital-delivery", changefreq: "monthly", priority: "0.5" },
        ];

        const entries: SitemapEntry[] = [...staticEntries];

        try {
          const { createClient } = await import("@supabase/supabase-js");
          const sb = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            {
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
            },
          );
          const { data } = await sb
            .from("products")
            .select("slug, updated_at")
            .eq("is_active", true);
          for (const product of data ?? [])
            entries.push({
              path: `/item/${product.slug}`,
              changefreq: "weekly",
              priority: "0.7",
            });
        } catch {
          /* ignore at SSR */
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
