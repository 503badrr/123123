import { timingSafeEqual } from "crypto";
import type { PaymentProvider, CreateChargeInput, CreateChargeResult, VerifyWebhookInput, WebhookEvent } from "./provider.server";

function requireSecret(): string {
  const key = process.env.MOYASAR_SECRET_KEY;
  if (!key) throw new Error("MOYASAR_SECRET_KEY is not configured. Add it to environment to enable Moyasar payments.");
  return key;
}

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function mapMoyasarStatus(status: unknown): WebhookEvent["status"] {
  switch (String(status ?? "").toLowerCase()) {
    case "paid":
    case "captured":
      return "captured";
    case "authorized":
      return "authorized";
    case "refunded":
      return "refunded";
    case "failed":
    case "voided":
      return "failed";
    default:
      return "pending";
  }
}

export const moyasar: PaymentProvider = {
  name: "moyasar",
  isConfigured: () => !!process.env.MOYASAR_SECRET_KEY,
  modeLabel: () => {
    const key = process.env.MOYASAR_SECRET_KEY;
    if (!key) return "Not configured";
    return /^sk_live_/.test(key) ? "Live ready" : "Sandbox ready";
  },

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const secret = requireSecret();
    const res = await fetch("https://api.moyasar.com/v1/invoices", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Basic " + Buffer.from(`${secret}:`).toString("base64"),
      },
      body: JSON.stringify({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        description: input.description,
        success_url: input.callbackUrl,
        back_url: "https://swwiitch.com/checkout",
        metadata: { order_id: input.orderId, order_number: input.orderNumber },
      }),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Moyasar invoice creation failed: ${res.status}`);
    return {
      providerRef: String(raw.id ?? ""),
      status: mapMoyasarStatus(raw.status) === "captured" ? "captured" : "pending",
      redirectUrl: raw?.url,
      raw,
    };
  },

  async verifyWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    const payload = JSON.parse(input.rawBody) as Record<string, any>;
    const configuredSecret = process.env.MOYASAR_WEBHOOK_SECRET;
    if (!configuredSecret) throw new Error("MOYASAR_WEBHOOK_SECRET is not configured.");

    const providedSecret = typeof payload.secret_token === "string" ? payload.secret_token : "";
    if (!providedSecret || !secureEqual(providedSecret, configuredSecret)) {
      throw new Error("Invalid Moyasar webhook secret token.");
    }

    const data = (payload.data ?? payload) as Record<string, any>;
    const eventId = String(payload.id ?? data.id ?? "");
    const paymentId = String(data.id ?? "");
    const amountHalalas = Number(data.amount);
    const currency = String(data.currency ?? "").toUpperCase();
    const metadata = (data.metadata ?? {}) as Record<string, unknown>;
    if (!eventId || !paymentId || !Number.isFinite(amountHalalas) || !currency) {
      throw new Error("Moyasar webhook is missing required payment fields.");
    }

    const { secret_token: _secretToken, ...safeEnvelope } = payload;
    return {
      eventId,
      providerRef: paymentId,
      status: mapMoyasarStatus(data.status),
      amount: amountHalalas / 100,
      currency,
      orderReference:
        metadata.order_number != null
          ? String(metadata.order_number)
          : metadata.order_id != null
            ? String(metadata.order_id)
            : null,
      raw: {
        ...safeEnvelope,
        data: {
          id: paymentId,
          status: data.status ?? null,
          amount: amountHalalas,
          currency,
          metadata,
        },
      },
    };
  },
};
