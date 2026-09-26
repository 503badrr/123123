import type { RetrievedCharge } from "./provider.server";

type LocalPaymentMatch = {
  orderNumber: string;
  providerRef: string;
  amount: number;
  currency: string;
};

type ProcessorResult = {
  ok?: boolean;
  duplicate?: boolean;
  already_paid?: boolean;
  order_number?: string;
  order_status?: string;
  payment_status?: string;
  customer_email?: string | null;
  customer_name?: string | null;
  total?: number;
  currency?: string;
  missing_codes?: number;
  codes?: Array<{ product_name: string; code: string }>;
  error?: string;
};

export type PaymentReturnStatus = "paid" | "pending" | "failed";

export type PaymentReconciliationResult = {
  orderNumber: string;
  status: PaymentReturnStatus;
  providerStatus: string | null;
  nextAction: "view-order" | "wait" | "retry";
};

export function validateReconciliationMatch(
  local: LocalPaymentMatch,
  remote: RetrievedCharge,
): void {
  if (remote.providerRef !== local.providerRef) {
    throw new Error("Tap charge reference mismatch.");
  }
  if (Math.abs(remote.amount - local.amount) > 0.01) {
    throw new Error("Tap payment amount mismatch.");
  }
  if (remote.currency.toUpperCase() !== local.currency.toUpperCase()) {
    throw new Error("Tap payment currency mismatch.");
  }
  if (remote.orderReference !== local.orderNumber) {
    throw new Error("Tap payment order reference mismatch.");
  }
}

function publicStatus(
  orderNumber: string,
  paymentStatus: string | null | undefined,
  orderStatus: string | null | undefined,
  providerStatus: string | null,
): PaymentReconciliationResult {
  if (
    paymentStatus === "paid" ||
    orderStatus === "paid" ||
    orderStatus === "processing" ||
    orderStatus === "fulfilled"
  ) {
    return { orderNumber, status: "paid", providerStatus, nextAction: "view-order" };
  }
  if (paymentStatus === "failed") {
    return { orderNumber, status: "failed", providerStatus, nextAction: "retry" };
  }
  return { orderNumber, status: "pending", providerStatus, nextAction: "wait" };
}

async function sendDeliveryIfNeeded(result: ProcessorResult): Promise<void> {
  const shouldEmail =
    result.payment_status === "paid" &&
    !result.duplicate &&
    !result.already_paid &&
    typeof result.customer_email === "string" &&
    result.customer_email.length > 3 &&
    typeof result.order_number === "string";

  if (!shouldEmail) return;

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
  } catch (error) {
    console.error(
      "[tap reconciliation] delivery email failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function reconcileOrderPayment(
  orderNumberInput: string,
): Promise<PaymentReconciliationResult> {
  const orderNumber = orderNumberInput.trim();
  if (!orderNumber) throw new Error("Order number is required.");

  const [{ supabaseAdmin }, { getProvider }] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("./provider.server"),
  ]);
  const db = supabaseAdmin as any;

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id,order_number,status,total,currency")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (orderError) throw new Error("Unable to load payment order.");
  if (!order) return { orderNumber, status: "pending", providerStatus: null, nextAction: "wait" };

  if (["paid", "processing", "fulfilled"].includes(String(order.status))) {
    return publicStatus(orderNumber, "paid", String(order.status), null);
  }

  const { data: payment, error: paymentError } = await db
    .from("payments")
    .select("provider,provider_payment_id,status,amount,currency,updated_at")
    .eq("order_id", order.id)
    .eq("provider", "tap")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (paymentError) throw new Error("Unable to load payment attempt.");
  if (!payment?.provider_payment_id) {
    return publicStatus(orderNumber, payment?.status, order.status, null);
  }

  const provider = await getProvider("tap");
  if (!provider.retrieveCharge) throw new Error("Tap charge retrieval is unavailable.");
  const remote = await provider.retrieveCharge(String(payment.provider_payment_id));

  validateReconciliationMatch(
    {
      orderNumber,
      providerRef: String(payment.provider_payment_id),
      amount: Number(payment.amount),
      currency: String(payment.currency),
    },
    remote,
  );

  const eventId = `reconcile:${remote.providerRef}:${remote.providerStatus.toLowerCase()}`;
  const safePayload = {
    provider: "tap",
    source: "reconciliation",
    id: remote.providerRef,
    status: remote.providerStatus,
    amount: remote.amount,
    currency: remote.currency,
    reference: { order: remote.orderReference },
    reconciled_at: new Date().toISOString(),
  };

  const { data, error } = await db.rpc("switch_process_payment_webhook", {
    p_provider: "tap",
    p_event_id: eventId,
    p_provider_payment_id: remote.providerRef,
    p_order_reference: remote.orderReference,
    p_payment_status: remote.status,
    p_amount: remote.amount,
    p_currency: remote.currency,
    p_payload: safePayload,
  });
  if (error) throw new Error("Payment reconciliation failed.");

  const result = (data ?? {}) as ProcessorResult;
  if (result.ok === false) {
    console.error("[tap reconciliation] processor rejected:", result.error ?? "unknown");
    throw new Error("Payment reconciliation was rejected.");
  }

  await sendDeliveryIfNeeded(result);

  return publicStatus(
    orderNumber,
    result.payment_status ?? remote.status,
    result.order_status ?? order.status,
    remote.providerStatus,
  );
}
