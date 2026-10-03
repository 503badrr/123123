import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertStaff(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin");
  if (error) { console.error("[server] DB error:", error.message); throw new Error("An unexpected error occurred. Please try again."); }
  if (!data) throw new Error("Forbidden");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const countOf = async (query: PromiseLike<{ count: number | null }>): Promise<number> =>
      (await query).count ?? 0;
    const codeStatuses = ["available", "reserved", "delivered", "disabled"] as const;

    // Count with head requests: selecting rows is silently capped at 1000 by PostgREST.
    const [ordersCount, activeProducts, usersCount, recent, ...codeCounts] = await Promise.all([
      countOf(db.from("orders").select("id", { count: "exact", head: true })),
      countOf(db.from("products").select("id", { count: "exact", head: true }).eq("is_active", true)),
      countOf(db.from("profiles").select("id", { count: "exact", head: true })),
      db
        .from("orders")
        .select("id, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      ...codeStatuses.map((status) =>
        countOf(db.from("digital_codes").select("id", { count: "exact", head: true }).eq("status", status)),
      ),
    ]);

    let revenue = 0;
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data: page } = await db
        .from("orders")
        .select("total")
        .in("status", ["paid", "fulfilled"])
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);
      const rows = (page ?? []) as Array<{ total: number | string }>;
      revenue += rows.reduce((sum, row) => sum + Number(row.total), 0);
      if (rows.length < pageSize) break;
    }

    return {
      orders_count: ordersCount,
      revenue,
      active_products: activeProducts,
      users_count: usersCount,
      codes: Object.fromEntries(codeStatuses.map((status, i) => [status, codeCounts[i]])) as Record<string, number>,
      recent_orders: recent.data ?? [],
    };
  });

export const listDigitalCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.string().optional(), search: z.string().trim().max(60).optional(), limit: z.number().int().max(200).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let q = db
      .from("digital_codes")
      .select("id, code_ciphertext, status, expires_at, created_at, product_id, products(name_ar, slug)")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("code_ciphertext", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) { console.error("[server] DB error:", error.message); throw new Error("An unexpected error occurred. Please try again."); }
    return (rows ?? []).map((row: any) => ({
      ...row,
      code: row.code_ciphertext,
      region: row.products?.slug ?? null,
    }));
  });

const CsvRowSchema = z.object({
  product_slug: z.string().optional(),
  product_sku: z.string().optional(),
  code: z.string().min(1),
  expires_at: z.string().optional().nullable(),
  status: z.enum(["available", "reserved", "delivered", "disabled", "AVAILABLE", "RESERVED", "DELIVERED", "DISABLED"]).optional(),
});

function normalizeCodeStatus(status: string | undefined) {
  const value = (status ?? "available").toLowerCase();
  return value === "reserved" || value === "delivered" || value === "disabled" ? value : "available";
}

export const importCodesCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ csv: z.string().min(10).max(2_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const lines = data.csv.split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length < 2) throw new Error("CSV فارغ");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((l) => {
      const cells = l.split(",").map((c) => c.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = cells[i] ?? ""));
      return CsvRowSchema.parse(obj);
    });

    const productKeys = [...new Set(rows.map((r) => r.product_slug || r.product_sku).filter(Boolean))] as string[];
    const { data: products } = await db.from("products").select("id, slug").in("slug", productKeys);
    const idBySlug = new Map((products ?? []).map((p: any) => [p.slug, p.id]));

    const toInsert = rows
      .map((r) => {
        const productKey = r.product_slug || r.product_sku;
        const product_id = productKey ? idBySlug.get(productKey) : null;
        if (!product_id) return null;
        return {
          product_id,
          code_ciphertext: r.code,
          expires_at: r.expires_at || null,
          status: normalizeCodeStatus(r.status),
        };
      })
      .filter(Boolean) as any[];

    let inserted = 0;
    const skipped = rows.length - toInsert.length;
    if (toInsert.length) {
      const { error, count } = await db.from("digital_codes").upsert(toInsert, { onConflict: "product_id,code_ciphertext", ignoreDuplicates: true, count: "exact" });
      if (error) { console.error("[server] DB error:", error.message); throw new Error("An unexpected error occurred. Please try again."); }
      inserted = count ?? toInsert.length;
    }
    await db.from("audit_logs").insert({ actor_id: context.userId, action: "codes.import", metadata: { inserted, skipped } });
    return { inserted, skipped, total: rows.length };
  });

export const getIntegrationsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { providerStatusForAll, getActiveProviderName } = await import("@/server/payments/provider.server");
    return { active: getActiveProviderName(), providers: providerStatusForAll() };
  });

export const getSecurityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: logs } = await db.from("audit_logs").select("id, action, entity_type, created_at, metadata").order("created_at", { ascending: false }).limit(30);
    const { data: webhooks } = await db.from("webhook_events").select("provider, processed, created_at").order("created_at", { ascending: false }).limit(20);
    return { logs: logs ?? [], webhooks: webhooks ?? [] };
  });

export const getFinanceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: payments } = await db.from("payments").select("amount, status, currency, created_at, provider").order("created_at", { ascending: false }).limit(50);
    const totals = (payments ?? []).reduce(
      (acc: { paid: number; refunded: number }, p: any) => {
        if (p.status === "paid") acc.paid += Number(p.amount);
        if (p.status === "refunded") acc.refunded += Number(p.amount);
        return acc;
      },
      { paid: 0, refunded: 0 },
    );
    return { payments: payments ?? [], totals };
  });
