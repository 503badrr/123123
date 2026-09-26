import { createHmac, timingSafeEqual } from "crypto";
import type {
  PaymentProvider,
  CreateChargeInput,
  CreateChargeResult,
  CreateRefundInput,
  CreateRefundResult,
  RetrievedCharge,
  VerifyWebhookInput,
  WebhookEvent,
} from "./provider.server";
import { formatTapAmount, mapCreateStatus, mapTapStatus, tapSourceId } from "./tap.logic";

function requireSecret(): string {
  const key = process.env.TAP_SECRET_KEY;
  if (!key) throw new Error("TAP_SECRET_KEY is not configured.");
  return key;
}

function webhookUrl(callbackUrl: string): string {
  return new URL("/api/public/webhooks/tap", callbackUrl).toString();
}

function refundWebhookUrl(): string {
  const siteUrl = process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (!siteUrl) throw new Error("PUBLIC_SITE_URL is required for Tap refunds.");
  return new URL("/api/public/webhooks/tap", siteUrl).toString();
}

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left.trim().toLowerCase(), "utf8");
  const b = Buffer.from(right.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyTapHash(payload: Record<string, any>, provided: string): void {
  if (!provided) throw new Error("Missing Tap hashstring header.");

  const currency = String(payload.currency ?? "").toUpperCase();
  const amount = formatTapAmount(payload.amount, currency);
  const reference = payload.reference ?? {};
  const created = String(payload.transaction?.created ?? payload.created ?? "");
  const toBeHashed =
    `x_id${String(payload.id ?? "")}` +
    `x_amount${amount}` +
    `x_currency${currency}` +
    `x_gateway_reference${String(reference.gateway ?? "")}` +
    `x_payment_reference${String(reference.payment ?? "")}` +
    `x_status${String(payload.status ?? "")}` +
    `x_created${created}`;
  const expected = createHmac("sha256", requireSecret()).update(toBeHashed, "utf8").digest("hex");
  if (!secureEqual(provided, expected)) throw new Error("Invalid Tap hashstring.");
}

function normalizeCustomer(customer: CreateChargeInput["customer"]): {
  first_name: string;
  last_name: string;
  email: string;
  phone: { country_code: string; number: string };
} {
  const nameParts = customer?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const email = customer?.email?.trim().toLowerCase() ?? "";
  let phoneDigits = customer?.phone?.replace(/\D/g, "") ?? "";
  if (phoneDigits.startsWith("00")) phoneDigits = phoneDigits.slice(2);

  const countryCode = "966";
  if (phoneDigits.startsWith("966") && phoneDigits.length > 3) phoneDigits = phoneDigits.slice(3);
  else if (phoneDigits.startsWith("0")) phoneDigits = phoneDigits.slice(1);

  if (nameParts.length === 0 || !email || phoneDigits.length < 8) {
    throw new Error("Tap customer name, email, and Saudi phone number are required.");
  }

  return {
    first_name: nameParts[0],
    last_name: nameParts.slice(1).join(" ") || nameParts[0],
    email,
    phone: { country_code: countryCode, number: phoneDigits },
  };
}

function normalizeRetrievedCharge(raw: Record<string, any>, expectedId: string): RetrievedCharge {
  const providerRef = typeof raw.id === "string" ? raw.id.trim() : "";
  const amount = Number(raw.amount);
  const currency = String(raw.currency ?? "").trim().toUpperCase();
  const providerStatus = String(raw.status ?? "").trim().toUpperCase();
  const orderReference = String(raw.reference?.order ?? "").trim();

  if (providerRef !== expectedId) throw new Error("Tap retrieved charge id mismatch.");
  if (!providerRef || !Number.isFinite(amount) || !currency || !providerStatus || !orderReference) {
    throw new Error("Tap retrieved charge is missing required reconciliation fields.");
  }

  return {
    providerRef,
    status: mapTapStatus(providerStatus),
    providerStatus,
    amount,
    currency,
    orderReference,
    raw,
  };
}

function normalizeRefundStatus(status: unknown): CreateRefundResult["status"] {
  switch (String(status ?? "").trim().toUpperCase()) {
    case "REFUNDED":
      return "refunded";
    case "DECLINED":
    case "FAILED":
    case "RESTRICTED":
    case "REJECTED":
    case "TIMED_OUT":
    case "TIMEDOUT":
      return "failed";
    default:
      return "pending";
  }
}

export const tap: PaymentProvider = {
  name: "tap",
  isConfigured: () => !!process.env.TAP_SECRET_KEY,
  modeLabel: () => {
    const key = process.env.TAP_SECRET_KEY;
    if (!key) return "Not configured";
    return /^sk_live_/.test(key) ? "Live ready" : "Sandbox ready";
  },

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const secret = requireSecret();
    const currency = input.currency.toUpperCase();
    const response = await fetch("https://api.tap.company/v2/charges/", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        amount: input.amount,
        currency,
        customer_initiated: true,
        threeDSecure: true,
        save_card: false,
        description: input.description,
        statement_descriptor: (process.env.TAP_STATEMENT_DESCRIPTOR?.trim() || "Switch").slice(0, 22),
        metadata: { udf1: input.orderId },
        reference: { transaction: input.orderNumber, order: input.orderNumber },
        customer: normalizeCustomer(input.customer),
        redirect: { url: input.callbackUrl },
        post: { url: webhookUrl(input.callbackUrl) },
        source: { id: tapSourceId(input.paymentMethod, currency, process.env.TAP_SOURCE_ID) },
      }),
    });
    const raw = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) throw new Error(`Tap charge failed: ${response.status}`);

    const providerRef = typeof raw.id === "string" ? raw.id.trim() : "";
    if (!providerRef) throw new Error("Tap charge response is missing its payment id.");
    const redirectUrl = typeof raw.transaction?.url === "string" && raw.transaction.url.trim() ? raw.transaction.url : undefined;

    return { providerRef, status: mapCreateStatus(raw.status), redirectUrl, raw };
  },

  async retrieveCharge(providerRef: string): Promise<RetrievedCharge> {
    const chargeId = providerRef.trim();
    if (!chargeId) throw new Error("Tap charge id is required.");
    const response = await fetch(`https://api.tap.company/v2/charges/${encodeURIComponent(chargeId)}`, {
      method: "GET",
      headers: { accept: "application/json", authorization: `Bearer ${requireSecret()}` },
    });
    const raw = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) throw new Error(`Tap retrieve charge failed: ${response.status}`);
    return normalizeRetrievedCharge(raw, chargeId);
  },

  async createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
    const currency = input.currency.trim().toUpperCase();
    const response = await fetch("https://api.tap.company/v2/refunds/", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${requireSecret()}`,
      },
      body: JSON.stringify({
        charge_id: input.providerPaymentId,
        amount: input.amount,
        currency,
        reason: input.reason,
        reference: {
          merchant: input.merchantReference,
          idempotent: input.merchantReference,
        },
        metadata: input.metadata ?? {},
        post: { url: refundWebhookUrl() },
      }),
    });
    const raw = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) throw new Error(`Tap refund failed: ${response.status}`);

    const providerRefundId = typeof raw.id === "string" ? raw.id.trim() : "";
    const providerStatus = String(raw.status ?? "").trim().toUpperCase();
    const amount = Number(raw.amount);
    const responseCurrency = String(raw.currency ?? "").trim().toUpperCase();
    if (!providerRefundId || !providerStatus || !Number.isFinite(amount) || !responseCurrency) {
      throw new Error("Tap refund response is missing required fields.");
    }
    if (String(raw.charge_id ?? "").trim() !== input.providerPaymentId) {
      throw new Error("Tap refund charge reference mismatch.");
    }
    if (Math.abs(amount - Number(input.amount)) > 0.001) {
      throw new Error("Tap refund amount mismatch.");
    }
    if (responseCurrency !== currency) {
      throw new Error("Tap refund currency mismatch.");
    }

    return {
      providerRefundId,
      status: normalizeRefundStatus(providerStatus),
      providerStatus,
      amount,
      currency: responseCurrency,
      raw,
    };
  },

  async verifyWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    const payload = JSON.parse(input.rawBody) as Record<string, any>;
    verifyTapHash(payload, input.headers["hashstring"] ?? "");

    const id = String(payload.id ?? "");
    const currency = String(payload.currency ?? "").toUpperCase();
    const amount = Number(payload.amount);
    const reference = payload.reference ?? {};
    if (!id || !currency || !Number.isFinite(amount)) {
      throw new Error("Tap webhook is missing required payment fields.");
    }

    return {
      eventId: id,
      providerRef: payload.object === "refund" ? String(payload.charge_id ?? id) : id,
      status: payload.object === "refund" ? (normalizeRefundStatus(payload.status) === "refunded" ? "refunded" : normalizeRefundStatus(payload.status) === "failed" ? "failed" : "pending") : mapTapStatus(payload.status),
      amount,
      currency,
      orderReference: reference.order ? String(reference.order) : null,
      raw: {
        provider: "tap",
        received_at: new Date().toISOString(),
        id,
        object: payload.object ?? "charge",
        charge_id: payload.charge_id ?? null,
        status: payload.status ?? null,
        amount,
        currency,
        reference: {
          order: reference.order ?? null,
          merchant: reference.merchant ?? null,
          payment: reference.payment ?? null,
          gateway: reference.gateway ?? null,
        },
      },
    };
  },
};
