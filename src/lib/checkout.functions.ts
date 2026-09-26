import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CheckoutInput = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(2).max(100),
        qty: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(8).max(20),
  }),
  paymentMethod: z.enum(["mada", "visa", "mastercard", "apple-pay"]),
  notes: z.string().trim().max(500).optional(),
});

type AtomicOrder = {
  order_id: string;
  order_number: string;
  total: number;
  currency: string;
};

function getSiteUrl(): string {
  const configuredUrl =
    process.env.PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    "https://swwiitch.com";

  const absoluteUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  return absoluteUrl.replace(/\/$/, "");
}

export const beginHostedCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CheckoutInput.parse(input))
  .handler(async ({ data }) => {
    const [{ supabaseAdmin }, { getProvider, isHostedCheckoutProviderSupported }, { enforceRateLimit, getClientIpHash }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/server/payments/provider.server"),
      import("@/server/rate-limit.server"),
    ]);

    const ipHash = await getClientIpHash();
    await enforceRateLimit({
      key: ipHash ? `checkout:ip:${ipHash}` : `checkout:email:${data.customer.email.toLowerCase()}`,
      limit: ipHash ? 5 : 3,
      windowSeconds: 3600,
      message: "تجاوزت الحد المسموح من محاولات الدفع. حاول بعد ساعة أو تواصل مع الدعم.",
    });
    const db = supabaseAdmin as any;
    const provider = await getProvider();

    if (!provider.isConfigured()) {
      throw new Error("بوابة الدفع غير مفعّلة حالياً. تواصل مع الدعم قبل إتمام الطلب.");
    }

    if (!isHostedCheckoutProviderSupported(provider.name)) {
      throw new Error(
        "مزود الدفع المحدد لا يدعم التحويل الآمن في هذا الإصدار. استخدم Moyasar أو Telr أو Tap بعد ضبط مفاتيح البوابة.",
      );
    }

    if (provider.name === "tap" && data.paymentMethod === "apple-pay" && process.env.TAP_APPLE_PAY_ENABLED !== "1") {
      throw new Error("Apple Pay غير مفعّلة حالياً على حساب Tap.");
    }

    const { data: orderPayload, error: orderError } = await db.rpc("create_checkout_order", {
      p_items: data.items,
      p_customer_name: data.customer.name,
      p_customer_email: data.customer.email,
      p_customer_phone: data.customer.phone,
      p_notes: [data.notes, `payment_method=${data.paymentMethod}`].filter(Boolean).join(" | "),
      p_payment_provider: provider.name,
    });

    if (orderError || !orderPayload) {
      console.error("[checkout] order creation failed:", orderError?.message);
      throw new Error("تعذر إنشاء الطلب. راجع بياناتك وحاول مرة أخرى.");
    }

    const order = orderPayload as AtomicOrder;
    const siteUrl = getSiteUrl();

    try {
      const charge = await provider.createCharge({
        orderId: order.order_id,
        orderNumber: order.order_number,
        amount: Number(order.total),
        currency: order.currency,
        description: `Switch order ${order.order_number}`,
        callbackUrl: `${siteUrl}/success?id=${encodeURIComponent(order.order_number)}`,
        customer: data.customer,
        paymentMethod: data.paymentMethod,
      });

      const paymentStatus =
        charge.status === "captured"
          ? "paid"
          : charge.status === "authorized"
            ? "authorized"
            : charge.status === "failed"
              ? "failed"
              : "pending";

      const { error: paymentError } = await db.from("payments").insert({
        order_id: order.order_id,
        provider: provider.name,
        provider_payment_id: charge.providerRef,
        status: paymentStatus,
        amount: order.total,
        currency: order.currency,
        raw_payload: charge.raw,
      });
      if (paymentError) {
        console.error("[checkout] payment record insert failed:", paymentError.message);
        await db.from("orders").update({ status: "failed" }).eq("id", order.order_id);
        throw new Error("تعذر حفظ جلسة الدفع. لم يتم خصم أي مبلغ.");
      }

      if (!charge.redirectUrl) {
        await db.from("orders").update({ status: "failed" }).eq("id", order.order_id);
        throw new Error("بوابة الدفع لم تُرجع رابطاً آمناً لإكمال العملية.");
      }

      return {
        orderNumber: order.order_number,
        redirectUrl: charge.redirectUrl,
        provider: provider.name,
      };
    } catch (error) {
      await db.from("orders").update({ status: "failed" }).eq("id", order.order_id);
      await db.from("audit_logs").insert({
        action: "checkout.payment_session_failed",
        entity_type: "order",
        entity_id: order.order_id,
        metadata: {
          order_number: order.order_number,
          provider: provider.name,
          message: error instanceof Error ? error.message : "unknown error",
        },
      });
      throw error instanceof Error ? error : new Error("تعذر بدء عملية الدفع.");
    }
  });
