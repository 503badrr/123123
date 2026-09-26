import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const OrderItemInput = z.object({
  product_id: z.string().uuid(),
  qty: z.number().int().min(1).max(20),
});

const CheckoutSchema = z.object({
  items: z.array(OrderItemInput).min(1).max(20),
  guest_name: z.string().trim().min(2).max(80).optional(),
  guest_email: z.string().trim().email().max(160).optional(),
  guest_phone: z.string().trim().min(8).max(20).optional(),
  notes: z.string().trim().max(500).optional(),
  payment_provider: z.enum(["telr", "tap"]).optional(),
});

type CheckoutPayload = {
  order_id: string;
  order_number: string;
  total: number;
  currency: string;
};

/**
 * Authenticated checkout creates a pending order using database prices.
 * It never reserves or delivers a code before a verified payment webhook.
 */
export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CheckoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, slug, is_active")
      .in("id", data.items.map((item) => item.product_id));
    if (productsError) throw new Error(productsError.message);

    const productById = new Map((products ?? []).map((product) => [product.id, product]));
    const checkoutItems = data.items.map((item) => {
      const product = productById.get(item.product_id);
      if (!product?.is_active) throw new Error("منتج غير متاح");
      return { slug: product.slug, qty: item.qty };
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", userId)
      .maybeSingle();

    const customerName = data.guest_name ?? profile?.full_name;
    const customerEmail = data.guest_email ?? profile?.email;
    const customerPhone = data.guest_phone ?? profile?.phone;
    if (!customerName || !customerEmail || !customerPhone) {
      throw new Error("أكمل الاسم والبريد ورقم الجوال قبل إنشاء الطلب.");
    }

    const { data: payload, error: orderError } = await supabaseAdmin.rpc("create_checkout_order", {
      p_items: checkoutItems,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone,
      p_notes: data.notes,
      p_payment_provider: data.payment_provider ?? "telr",
    });
    if (orderError || !payload) {
      throw new Error(orderError?.message ?? "Order creation failed");
    }

    const order = payload as CheckoutPayload;
    const { error: ownerError } = await supabaseAdmin
      .from("orders")
      .update({ user_id: userId })
      .eq("id", order.order_id);
    if (ownerError) throw new Error(ownerError.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "تم استلام طلبك",
      body: `طلب رقم ${order.order_number} بقيمة ${order.total} ر.س بانتظار تأكيد الدفع`,
      link: `/success?id=${order.order_number}`,
    });

    return {
      order_id: order.order_id,
      order_number: order.order_number,
      total: order.total,
      currency: order.currency,
      status: "pending" as const,
      codes: [] as Array<{ product: string; code: string | null }>,
    };
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, order_number, status, total, currency, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[server] DB error:", error.message);
      throw new Error("An unexpected error occurred. Please try again.");
    }
    return data ?? [];
  });

export const getMyOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_number: z.string().min(3).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("id, order_number, status, total, currency, created_at, notes")
      .eq("order_number", data.order_number)
      .maybeSingle();
    if (error) {
      console.error("[server] DB error:", error.message);
      throw new Error("An unexpected error occurred. Please try again.");
    }
    if (!order) return null;
    const { data: items } = await context.supabase
      .from("order_items")
      .select("id, product_name, quantity, unit_price, total")
      .eq("order_id", order.id);
    return { ...order, items: items ?? [] };
  });
