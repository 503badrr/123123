import { createHash, randomUUID, timingSafeEqual } from "crypto";
import type { CreateChargeInput, CreateChargeResult, PaymentProvider, VerifyWebhookInput, WebhookEvent } from "./provider.server";

const TELR_ORDER_ENDPOINT = "https://secure.telr.com/gateway/order.json";

const TRANSACTION_SIGNATURE_FIELDS = [
  "tran_store",
  "tran_type",
  "tran_class",
  "tran_test",
  "tran_ref",
  "tran_prevref",
  "tran_firstref",
  "tran_order",
  "tran_currency",
  "tran_amount",
  "tran_cartid",
  "tran_desc",
  "tran_status",
  "tran_authcode",
  "tran_authmessage",
] as const;

type TelrPayload = Record<string, string>;

type TelrCreateSessionResponse =
  | {
      method?: string;
      order?: {
        ref?: string;
        url?: string;
      };
    }
  | {
      method?: string;
      error?: {
        message?: string;
        note?: string;
      };
    };

function getStoreId(): number {
  const raw = process.env.TELR_STORE_ID ?? process.env.TELR_STORE;
  const store = Number(raw);
  if (!raw || !Number.isInteger(store) || store <= 0) {
    throw new Error("TELR_STORE_ID is not configured. Add your numeric Telr store ID to environment variables.");
  }
  return store;
}

function getAuthKey(): string {
  const authKey = process.env.TELR_AUTH_KEY;
  if (!authKey) throw new Error("TELR_AUTH_KEY is not configured. Add your Telr authentication key to environment variables.");
  return authKey;
}

function getWebhookSecret(): string {
  const secret = process.env.TELR_WEBHOOK_SECRET ?? process.env.TELR_SECRET_KEY;
  if (!secret) throw new Error("TELR_WEBHOOK_SECRET is not configured. Add it to environment to enable Telr webhooks.");
  return secret;
}

function getSiteUrl(): string {
  const raw = process.env.SITE_URL ?? process.env.PUBLIC_SITE_URL ?? process.env.APP_URL ?? process.env.URL ?? "https://swwiitch.com";
  return raw.replace(/\/$/, "");
}

function getTestMode(): "0" | "1" {
  const mode = (process.env.TELR_TEST_MODE ?? process.env.TELR_MODE ?? "1").toLowerCase();
  return mode === "0" || mode === "live" || mode === "production" ? "0" : "1";
}

function getPanels(): string | undefined {
  return process.env.TELR_PANELS?.trim() || undefined;
}

function parseWebhookBody(rawBody: string, contentType?: string): TelrPayload {
  const trimmed = rawBody.trim();
  if (contentType?.includes("application/json") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, value == null ? "" : String(value).trim()]));
  }

  const params = new URLSearchParams(rawBody);
  const payload: TelrPayload = {};
  params.forEach((value, key) => {
    payload[key] = value.trim();
  });
  return payload;
}

function signTelrData(payload: TelrPayload, secret: string, fields: readonly string[]): string {
  const signatureString = fields.reduce((acc, field) => `${acc}:${payload[field] ?? ""}`, secret);
  return createHash("sha1").update(signatureString, "utf8").digest("hex");
}

function safeEqual(actual: string, expected: string): boolean {
  const left = Buffer.from(actual.trim().toLowerCase(), "utf8");
  const right = Buffer.from(expected.trim().toLowerCase(), "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyTransactionSignature(payload: TelrPayload): void {
  const secret = getWebhookSecret();
  const provided = payload.tran_check;
  if (!provided) throw new Error("Missing Telr tran_check signature");

  const expected = signTelrData(payload, secret, TRANSACTION_SIGNATURE_FIELDS);
  if (!safeEqual(provided, expected)) throw new Error("Invalid Telr transaction signature");
}

function firstPresent(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value != null && value.trim().length > 0)?.trim();
}

function parseAmount(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapTelrStatus(payload: TelrPayload): WebhookEvent["status"] {
  const status = payload.tran_status?.toUpperCase();
  const type = payload.tran_type?.toLowerCase() ?? "";

  if (status === "A" || status === "H") {
    if (type.includes("refund")) return "refunded";
    if (type === "auth" || type.includes("auth")) return "authorized";
    if (status === "H") return "authorized";
    return "captured";
  }

  return "failed";
}

function normalizeAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Telr amount must be greater than zero.");
  return amount.toFixed(2);
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

export const telr: PaymentProvider = {
  name: "telr",
  isConfigured: () => !!(process.env.TELR_STORE_ID ?? process.env.TELR_STORE) && !!process.env.TELR_AUTH_KEY,
  modeLabel: () => {
    if (!(process.env.TELR_STORE_ID ?? process.env.TELR_STORE) || !process.env.TELR_AUTH_KEY) return "Not configured";
    return getTestMode() === "0" ? "Live ready" : "Sandbox ready";
  },

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const siteUrl = getSiteUrl();
    const panels = getPanels();
    const payload = {
      method: "create",
      store: getStoreId(),
      authkey: getAuthKey(),
      framed: Number(process.env.TELR_FRAMED ?? 0),
      order: {
        cartid: truncate(input.orderNumber || input.orderId, 63),
        test: getTestMode(),
        amount: normalizeAmount(input.amount),
        currency: input.currency.toUpperCase(),
        description: truncate(input.description || `SWITCH order ${input.orderNumber}`, 63),
        ...(process.env.TELR_TRANTYPE ? { trantype: process.env.TELR_TRANTYPE } : {}),
      },
      return: {
        authorised: `${siteUrl}/success?id=${encodeURIComponent(input.orderNumber)}&provider=telr`,
        declined: `${siteUrl}/checkout?status=declined&order=${encodeURIComponent(input.orderNumber)}&provider=telr`,
        cancelled: `${siteUrl}/checkout?status=cancelled&order=${encodeURIComponent(input.orderNumber)}&provider=telr`,
      },
      ...(panels ? { panels } : {}),
      webhooks: [{ url: `${siteUrl}/api/public/webhooks/telr` }],
    };

    const res = await fetch(TELR_ORDER_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = (await res.json().catch(() => ({}))) as TelrCreateSessionResponse;
    const error = "error" in raw ? raw.error : undefined;
    const order = "order" in raw ? raw.order : undefined;

    if (!res.ok || error || !order?.ref || !order?.url) {
      const message = [error?.message, error?.note].filter(Boolean).join(" - ") || `Telr session creation failed: HTTP ${res.status}`;
      throw new Error(message);
    }

    return {
      providerRef: order.ref,
      status: "pending",
      redirectUrl: order.url,
      raw,
    };
  },

  async verifyWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    const contentType = input.headers["content-type"] ?? input.headers["Content-Type"];
    const payload = parseWebhookBody(input.rawBody, contentType);

    verifyTransactionSignature(payload);

    const fallbackEventId = createHash("sha1").update(input.rawBody || randomUUID(), "utf8").digest("hex");
    const eventId = firstPresent(payload.tran_ref, payload.tran_prevref, payload.tran_firstref) ?? fallbackEventId;
    const orderReference = firstPresent(payload.tran_order, payload.tran_cartid, payload.xtra_order_number, payload.xtra_order_id);

    return {
      eventId,
      providerRef: firstPresent(payload.tran_ref, payload.tran_prevref, payload.tran_firstref) ?? eventId,
      status: mapTelrStatus(payload),
      amount: parseAmount(payload.tran_amount),
      currency: firstPresent(payload.tran_currency)?.toUpperCase() ?? null,
      orderReference,
      raw: {
        provider: "telr",
        received_at: new Date().toISOString(),
        fields: payload,
      },
    };
  },
};
