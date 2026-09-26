import type { RefundReason } from "@/server/payments/provider.server";

export type McpPaymentActor = {
  userId: string;
  role: "viewer" | "admin" | "owner";
};

export type SafePaymentRecord = {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  status: string;
  amount: number;
  currency: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export function sanitizePaymentRecord(row: Record<string, any>): SafePaymentRecord {
  return {
    id: String(row.id ?? ""),
    orderId: String(row.order_id ?? ""),
    provider: String(row.provider ?? ""),
    providerPaymentId: row.provider_payment_id ? String(row.provider_payment_id) : null,
    status: String(row.status ?? ""),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "").toUpperCase(),
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function assertPaymentReadAllowed(actor: McpPaymentActor): void {
  if (!actor.userId.trim()) throw new Error("MCP payment actor identity is required.");
  if (!["viewer", "admin", "owner"].includes(actor.role)) throw new Error("Unsupported MCP payment role.");
}

export function assertPaymentWriteAllowed(actor: McpPaymentActor, confirmation: string): void {
  if (!actor.userId.trim()) throw new Error("MCP payment actor identity is required.");
  if (actor.role !== "admin" && actor.role !== "owner") {
    throw new Error("MCP payment write requires admin or owner role.");
  }
  if (confirmation !== "CONFIRM_REFUND") {
    throw new Error("MCP payment write requires exact confirmation.");
  }
}

export async function tapGetPayment(
  actor: McpPaymentActor,
  paymentId: string,
): Promise<SafePaymentRecord | null> {
  assertPaymentReadAllowed(actor);
  if (!paymentId.trim()) throw new Error("Payment id is required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("payments")
    .select("id,order_id,provider,provider_payment_id,status,amount,currency,created_at,updated_at")
    .eq("id", paymentId)
    .eq("provider", "tap")
    .maybeSingle();
  if (error) throw new Error("Unable to read payment.");
  return data ? sanitizePaymentRecord(data) : null;
}

export async function tapGetOrderPayment(
  actor: McpPaymentActor,
  orderNumber: string,
): Promise<SafePaymentRecord | null> {
  assertPaymentReadAllowed(actor);
  if (!orderNumber.trim()) throw new Error("Order number is required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (orderError) throw new Error("Unable to read order.");
  if (!order) return null;

  const { data, error } = await db
    .from("payments")
    .select("id,order_id,provider,provider_payment_id,status,amount,currency,created_at,updated_at")
    .eq("order_id", order.id)
    .eq("provider", "tap")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Unable to read order payment.");
  return data ? sanitizePaymentRecord(data) : null;
}

export async function tapListPayments(
  actor: McpPaymentActor,
  limit = 20,
): Promise<SafePaymentRecord[]> {
  assertPaymentReadAllowed(actor);
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 50));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("payments")
    .select("id,order_id,provider,provider_payment_id,status,amount,currency,created_at,updated_at")
    .eq("provider", "tap")
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw new Error("Unable to list payments.");
  return (data ?? []).map((row: Record<string, any>) => sanitizePaymentRecord(row));
}

export async function tapVerifyPayment(
  actor: McpPaymentActor,
  orderNumber: string,
): Promise<{
  orderNumber: string;
  status: "paid" | "pending" | "failed";
  providerStatus: string | null;
  nextAction: "view-order" | "wait" | "retry";
}> {
  assertPaymentReadAllowed(actor);
  const { reconcileOrderPayment } = await import("@/server/payments/reconcile.server");
  return reconcileOrderPayment(orderNumber);
}

export async function tapRefundPayment(
  actor: McpPaymentActor,
  input: {
    paymentId: string;
    amount: number;
    reason: RefundReason;
    confirmation: string;
  },
) {
  assertPaymentWriteAllowed(actor, input.confirmation);
  const { createTapRefund } = await import("@/server/payments/refunds.server");
  return createTapRefund({
    paymentId: input.paymentId,
    amount: input.amount,
    reason: input.reason,
    actorId: actor.userId,
  });
}
