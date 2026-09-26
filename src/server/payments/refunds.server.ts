import { randomUUID } from "crypto";
import type { RefundReason, WebhookEvent } from "./provider.server";

type RefundablePayment = {
  amount: number;
  currency: string;
  status: string;
  refundedAmount: number;
};

type RefundRequest = {
  amount: number;
  reason: RefundReason;
};

type ReservedRefund = {
  refund_id: string;
  order_id: string;
  order_number: string;
  provider_payment_id: string;
  amount: number;
  currency: string;
  correlation_id: string;
};

const REFUND_REASONS: RefundReason[] = ["duplicate", "fraudulent", "requested_by_customer"];
const TERMINAL_REFUND_STATUSES = new Set(["refunded", "failed", "rejected"]);

export function validateRefundRequest(payment: RefundablePayment, request: RefundRequest): void {
  if (payment.status !== "paid") throw new Error("Refund requires a paid payment.");
  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    throw new Error("Refund amount must be positive.");
  }
  if (!REFUND_REASONS.includes(request.reason)) throw new Error("Unsupported refund reason.");

  const remaining = Number(payment.amount) - Number(payment.refundedAmount || 0);
  if (request.amount > remaining + 0.001) {
    throw new Error("Refund amount exceeds the remaining captured amount.");
  }
}

function localRefundStatus(providerStatus: string): "pending" | "accepted" | "refunded" | "failed" | "rejected" {
  switch (providerStatus.toUpperCase()) {
    case "REFUNDED":
      return "refunded";
    case "ACCEPTED":
      return "accepted";
    case "REJECTED":
      return "rejected";
    case "DECLINED":
    case "FAILED":
    case "RESTRICTED":
    case "TIMED_OUT":
    case "TIMEDOUT":
      return "failed";
    default:
      return "pending";
  }
}

function safeRefundPayload(raw: unknown): Record<string, unknown> {
  const value = (raw ?? {}) as Record<string, any>;
  return {
    id: value.id ?? null,
    object: value.object ?? "refund",
    charge_id: value.charge_id ?? null,
    status: value.status ?? null,
    amount: value.amount ?? null,
    currency: value.currency ?? null,
    reference: {
      merchant: value.reference?.merchant ?? null,
      idempotent: value.reference?.idempotent ?? null,
    },
    response: value.response
      ? { code: value.response.code ?? null, message: value.response.message ?? null }
      : null,
  };
}

async function finalizeParentRefundState(db: any, paymentId: string, orderId: string): Promise<void> {
  const [{ data: payment, error: paymentError }, { data: refundedRows, error: refundedError }] = await Promise.all([
    db.from("payments").select("amount,status").eq("id", paymentId).single(),
    db.from("payment_refunds").select("amount").eq("payment_id", paymentId).eq("status", "refunded"),
  ]);
  if (paymentError || refundedError || !payment) {
    throw new Error("Could not aggregate refund state.");
  }

  const refundedTotal = (refundedRows ?? []).reduce(
    (sum: number, row: { amount: number }) => sum + Number(row.amount),
    0,
  );
  if (refundedTotal < Number(payment.amount) - 0.001) return;

  const now = new Date().toISOString();
  const { error: paymentUpdateError } = await db
    .from("payments")
    .update({ status: "refunded", updated_at: now })
    .eq("id", paymentId);
  if (paymentUpdateError) throw new Error("Could not mark payment refunded.");

  const { error: orderUpdateError } = await db
    .from("orders")
    .update({ status: "refunded", updated_at: now })
    .eq("id", orderId);
  if (orderUpdateError) throw new Error("Could not mark order refunded.");
}

export async function createTapRefund(input: {
  paymentId: string;
  amount: number;
  reason: RefundReason;
  actorId: string;
}): Promise<{
  refundId: string;
  providerRefundId: string;
  status: string;
  amount: number;
  currency: string;
  correlationId: string;
}> {
  if (!input.paymentId.trim()) throw new Error("Payment id is required.");
  if (!REFUND_REASONS.includes(input.reason)) throw new Error("Unsupported refund reason.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Refund amount must be positive.");

  const [{ supabaseAdmin }, { getProvider }] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("./provider.server"),
  ]);
  const db = supabaseAdmin as any;
  const correlationId = randomUUID();

  const { data: reservation, error: reserveError } = await db.rpc("switch_reserve_payment_refund", {
    p_payment_id: input.paymentId,
    p_amount: input.amount,
    p_reason: input.reason,
    p_requested_by: input.actorId,
    p_correlation_id: correlationId,
  });
  if (reserveError || !reservation) {
    console.warn("[refund] reservation rejected:", reserveError?.message ?? "unknown");
    throw new Error("Refund could not be reserved safely.");
  }

  const reserved = reservation as ReservedRefund;
  const provider = await getProvider("tap");
  if (!provider.createRefund) throw new Error("Tap refund API is unavailable.");

  try {
    const remote = await provider.createRefund({
      providerPaymentId: reserved.provider_payment_id,
      amount: Number(reserved.amount),
      currency: reserved.currency,
      reason: input.reason,
      merchantReference: reserved.correlation_id,
      metadata: {
        order_number: reserved.order_number,
        refund_id: reserved.refund_id,
      },
    });
    const status = localRefundStatus(remote.providerStatus);

    const { error: updateError } = await db
      .from("payment_refunds")
      .update({
        provider_refund_id: remote.providerRefundId,
        provider_status: remote.providerStatus,
        status,
        raw_payload: safeRefundPayload(remote.raw),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reserved.refund_id);
    if (updateError) throw new Error("Refund created remotely but local status could not be saved.");

    if (status === "refunded") {
      await finalizeParentRefundState(db, input.paymentId, reserved.order_id);
    }

    await db.from("audit_logs").insert({
      actor_id: input.actorId,
      action: "payment.refund_requested",
      entity_type: "payment",
      entity_id: input.paymentId,
      metadata: {
        refund_id: reserved.refund_id,
        provider_refund_id: remote.providerRefundId,
        amount: remote.amount,
        currency: remote.currency,
        reason: input.reason,
        status,
        correlation_id: correlationId,
      },
    });

    return {
      refundId: reserved.refund_id,
      providerRefundId: remote.providerRefundId,
      status,
      amount: remote.amount,
      currency: remote.currency,
      correlationId,
    };
  } catch (error) {
    await db.from("audit_logs").insert({
      actor_id: input.actorId,
      action: "payment.refund_requires_reconciliation",
      entity_type: "payment",
      entity_id: input.paymentId,
      metadata: { refund_id: reserved.refund_id, correlation_id: correlationId },
    });
    throw error instanceof Error ? error : new Error("Refund outcome is ambiguous and requires reconciliation.");
  }
}

export async function processTapRefundWebhook(event: WebhookEvent): Promise<{ ok: true; duplicate?: boolean }> {
  const raw = (event.raw ?? {}) as Record<string, any>;
  const refundId = String(raw.id ?? "").trim();
  const providerStatus = String(raw.status ?? "").trim().toUpperCase();
  const merchantReference = String(raw.reference?.merchant ?? "").trim();
  if (!refundId || raw.object !== "refund" || !providerStatus) {
    throw new Error("Invalid Tap refund webhook payload.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const eventId = `${refundId}:${providerStatus}`;

  const { data: existing } = await db
    .from("webhook_events")
    .select("id,processed")
    .eq("provider", "tap_refund")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing?.processed) return { ok: true, duplicate: true };

  if (!existing) {
    const { error: insertEventError } = await db.from("webhook_events").insert({
      provider: "tap_refund",
      event_id: eventId,
      payload: safeRefundPayload(raw),
      processed: false,
    });
    if (insertEventError && insertEventError.code !== "23505") {
      throw new Error("Could not record refund webhook.");
    }
  }

  let query = db.from("payment_refunds").select("id,payment_id,order_id,amount,currency,status");
  query = merchantReference
    ? query.or(`provider_refund_id.eq.${refundId},correlation_id.eq.${merchantReference}`)
    : query.eq("provider_refund_id", refundId);
  const { data: refund, error: refundError } = await query.limit(1).maybeSingle();
  if (refundError || !refund) {
    throw new Error("Refund ledger row was not found for webhook.");
  }

  const nextStatus = localRefundStatus(providerStatus);
  const status = TERMINAL_REFUND_STATUSES.has(String(refund.status)) && !TERMINAL_REFUND_STATUSES.has(nextStatus)
    ? String(refund.status)
    : nextStatus;

  const { error: refundUpdateError } = await db
    .from("payment_refunds")
    .update({
      provider_refund_id: refundId,
      provider_status: providerStatus,
      status,
      raw_payload: safeRefundPayload(raw),
      updated_at: new Date().toISOString(),
    })
    .eq("id", refund.id);
  if (refundUpdateError) throw new Error("Could not persist refund webhook state.");

  if (status === "refunded") {
    await finalizeParentRefundState(db, refund.payment_id, refund.order_id);
  }

  const { error: auditError } = await db.from("audit_logs").insert({
    action: `payment.refund_${status}`,
    entity_type: "payment",
    entity_id: refund.payment_id,
    metadata: {
      refund_id: refund.id,
      provider_refund_id: refundId,
      amount: event.amount ?? refund.amount,
      currency: event.currency ?? refund.currency,
      provider_status: providerStatus,
    },
  });
  if (auditError) throw new Error("Could not persist refund audit event.");

  const { error: processedError } = await db
    .from("webhook_events")
    .update({ processed: true, error: null })
    .eq("provider", "tap_refund")
    .eq("event_id", eventId);
  if (processedError) throw new Error("Could not mark refund webhook processed.");

  return { ok: true };
}
