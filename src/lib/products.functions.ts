import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export type ProductRow = {
  id: string;
  sku: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  kind: "game" | "card" | "subscription" | "offer";
  price: number;
  compare_at_price: number | null;
  currency: string;
  image_url: string | null;
  badge: string | null;
  region: string | null;
  is_featured: boolean;
};

type ProductDbRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  | "id"
  | "slug"
  | "name_ar"
  | "description_ar"
  | "category"
  | "price"
  | "old_price"
  | "currency"
  | "image_url"
  | "region"
  | "sort_order"
>;

const KindEnum = z.enum(["game", "card", "subscription", "offer"]).optional();

function categoryForKind(kind: ProductRow["kind"]): string {
  return kind === "game" ? "games" : kind === "card" ? "cards" : kind === "subscription" ? "subscriptions" : "offers";
}

function kindForCategory(category: string): ProductRow["kind"] {
  if (category === "games" || category === "game") return "game";
  if (category === "cards" || category === "card") return "card";
  if (category === "subscriptions" || category === "subscription") return "subscription";
  return "offer";
}

function toProductRow(row: ProductDbRow): ProductRow {
  return {
    id: row.id,
    sku: row.slug,
    slug: row.slug,
    name_ar: row.name_ar,
    description_ar: row.description_ar,
    kind: kindForCategory(row.category),
    price: Number(row.price),
    compare_at_price: row.old_price === null ? null : Number(row.old_price),
    currency: row.currency,
    image_url: row.image_url,
    badge: row.old_price !== null ? "عرض" : null,
    region: row.region,
    is_featured: row.sort_order <= 60 || row.old_price !== null,
  };
}

const productSelect = "id, slug, name_ar, description_ar, category, price, old_price, currency, image_url, region, sort_order";

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ kind: KindEnum, featured: z.boolean().optional(), limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("products").select(productSelect).eq("is_active", true).order("sort_order", { ascending: true });
    if (data.kind) q = q.eq("category", categoryForKind(data.kind));
    if (data.featured) q = q.or("sort_order.lte.60,old_price.not.is.null");
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) {
      console.error("[server] DB error:", error.message);
      throw new Error("An unexpected error occurred. Please try again.");
    }
    return (rows ?? []).map((row) => toProductRow(row as ProductDbRow));
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("products")
      .select(productSelect)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      console.error("[server] DB error:", error.message);
      throw new Error("An unexpected error occurred. Please try again.");
    }
    return row ? toProductRow(row as ProductDbRow) : null;
  });

export const getProductsByIds = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("products")
      .select(productSelect)
      .in("id", data.ids)
      .eq("is_active", true);
    if (error) {
      console.error("[server] DB error:", error.message);
      throw new Error("An unexpected error occurred. Please try again.");
    }
    return (rows ?? []).map((row) => toProductRow(row as ProductDbRow));
  });
