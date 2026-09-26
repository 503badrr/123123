// Shared webhook pipeline for every payment provider:
//   1) verify the provider signature,
//   2) route Tap refund objects to the refund ledger,
//   3) route payment objects through the atomic payment processor,
//   4) deliver digital codes/email exactly once on capture.
import type { ProviderName } from "./provider.server";

interface ProcessorResult {
  ok?: boolean;
  duplicate?: boolean;
  already_paid?: boolean;
  order_found?: boolean;
  error?: string;
  order_number?: string;
  order_status?: string;
  payment_status?: string;
  customer_email?: string | null;
  customer_name?: string | null;
  total?: number;
  currency?: string;
  missing_codes?: number;
  codes?: Array<{ product_name: string; code: string }>;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function handleProviderWebhook(request: Request, provider: ProviderName): Promise<Response> {
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const [{ getProvider }, { supabaseAdmin }] = await Promise.all([
    import("./provider.server"),
    import("@/integrations/supabase/client.server"),
  ]);

  let event;
  try {
    event = await (await getProvider(provider)).verifyWebhook({ rawBody, headers });
  } catch (error) {
    console.warn(`[${provider} webhook] rejected:`, error instanceof Error ? error.message : error);
    return json({ ok: false, error: "INVALID_WEBHOOK_SIGNATURE" }, 401);
  }

  const safeRaw = (event.raw ?? {}) as Record<string, unknown>;
  if (provider === "tap" && safeRaw.object === "refund") {
    try {
      const { processTapRefundWebhook } = await import("./refunds.server");
      const result = await processTapRefundWebhook(event);
      return json({ ok: true, provider: "tap", kind: "refund", duplicate: result.duplicate ?? false });
    } catch (error) {
      console.error("[tap refund webhook] processor failed:", error instanceof Error ? error.message : error);
      return json({ ok: false, error: "REFUND_WEBHOOK_PROCESSOR_FAILED" }, 500);
    }
  }

  const { data, error } = await supabaseAdmin.rpc("switch_process_payment_webhook", {
    p_provider: provider,
    p_event_id: event.eventId,
    p_provider_payment_id: event.providerRef,
    p_order_reference: event.orderReference ?? "",
    p_payment_status: event.status,
    p_amount: event.amount ?? (null as unknown as number),
    p_currency: event.currency ?? (null as unknown as string),
    p_payload: event.raw as never,
  });

  if (error) {
    console.error(`[${provider} webhook] processor failed:`, error.message);
    return json({ ok: false, error: "WEBHOOK_PROCESSOR_FAILED" }, 500);
  }

  const result = (data ?? {}) as ProcessorResult;
  if (result.ok === false) {
    console.error(`[${provider} webhook] rejected by processor:`, result.error);
    return json({ ok: false, error: result.error ?? "REJECTED" }, 200);
  }

  const shouldEmail =
    result.payment_status === "paid" &&
    !result.duplicate &&
    !result.already_paid &&
    typeof result.customer_email === "string" &&
    result.customer_email.length > 3 &&
    typeof result.order_number === "string";

  if (shouldEmail) {
    try {
      const { sendOrderDeliveryEmail } = await import("../email.server");
      await sendOrderDeliveryEmail({
        to: result.customer_email as string,
        customerName: result.customer_name ?? null,
        orderNumber: result.order_number as string,
        orderStatus: result.order_status ?? "paid",
        total: Number(result.total ?? 0),
        currency: result.currency ?? "SAR",
        codes: Array.isArray(result.codes) ? result.codes : [],
        missingCodes: Number(result.missing_codes ?? 0),
      });
    } catch (emailError) {
      console.error(
        `[${provider} webhook] delivery email failed:`,
        emailError instanceof Error ? emailError.message : emailError,
      );
    }
  }

  return json({
    ok: true,
    provider,
    duplicate: result.duplicate ?? false,
    order_status: result.order_status,
  });
}
