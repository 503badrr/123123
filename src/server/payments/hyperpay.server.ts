import type { PaymentProvider, CreateChargeInput, CreateChargeResult, VerifyWebhookInput, WebhookEvent } from "./provider.server";

function requireKeys() {
  const token = process.env.HYPERPAY_ACCESS_TOKEN;
  const entity = process.env.HYPERPAY_ENTITY_ID;
  if (!token || !entity) throw new Error("HYPERPAY_ACCESS_TOKEN and HYPERPAY_ENTITY_ID are required.");
  return { token, entity };
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error("Invalid hex value in HyperPay webhook material.");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// HyperPay webhooks arrive AES-256-GCM encrypted: the hex key is the configured
// webhook secret, the IV and auth tag come as headers, and the request body is
// {"encryptedBody": "<hex ciphertext>"}. Web Crypto expects ciphertext||tag.
async function decryptHyperPayWebhook(input: VerifyWebhookInput): Promise<Record<string, unknown>> {
  const secretHex = process.env.HYPERPAY_WEBHOOK_SECRET;
  if (!secretHex) throw new Error("HYPERPAY_WEBHOOK_SECRET is not configured.");

  const ivHex = input.headers["x-initialization-vector"];
  const tagHex = input.headers["x-authentication-tag"];
  if (!ivHex || !tagHex) throw new Error("Missing HyperPay webhook encryption headers.");

  let encryptedHex: string;
  try {
    const body = JSON.parse(input.rawBody) as { encryptedBody?: unknown };
    if (typeof body.encryptedBody !== "string" || body.encryptedBody.length === 0) {
      throw new Error("missing encryptedBody");
    }
    encryptedHex = body.encryptedBody;
  } catch {
    throw new Error("HyperPay webhook body is not the expected encrypted envelope.");
  }

  const keyBytes = hexToBytes(secretHex);
  if (keyBytes.length !== 32) throw new Error("HYPERPAY_WEBHOOK_SECRET must be a 64-char hex AES-256 key.");
  const iv = hexToBytes(ivHex);
  const tag = hexToBytes(tagHex);
  const ciphertext = hexToBytes(encryptedHex);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, { name: "AES-GCM" }, false, ["decrypt"]);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
      key,
      combined as BufferSource,
    );
  } catch {
    // Authentication failure — tampered payload or wrong secret.
    throw new Error("HyperPay webhook failed AES-GCM authentication.");
  }
  return JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, unknown>;
}

// https://hyperpay.docs — result codes starting with these patterns are
// successful captures; 000.200.* means the checkout is still pending.
const HYPERPAY_SUCCESS = /^(000\.000\.|000\.100\.1|000\.[36])/;
const HYPERPAY_PENDING = /^(000\.200)/;

function mapHyperPayStatus(resultCode: string, paymentType: string): WebhookEvent["status"] {
  if (paymentType === "RF") return HYPERPAY_SUCCESS.test(resultCode) ? "refunded" : "failed";
  if (HYPERPAY_SUCCESS.test(resultCode)) return paymentType === "PA" ? "authorized" : "captured";
  if (HYPERPAY_PENDING.test(resultCode)) return "pending";
  return "failed";
}

export const hyperpay: PaymentProvider = {
  name: "hyperpay",
  isConfigured: () => !!(process.env.HYPERPAY_ACCESS_TOKEN && process.env.HYPERPAY_ENTITY_ID),
  modeLabel: () => (!process.env.HYPERPAY_ACCESS_TOKEN || !process.env.HYPERPAY_ENTITY_ID ? "Not configured" : "Sandbox ready"),

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const { token, entity } = requireKeys();
    const base = (process.env.HYPERPAY_BASE_URL ?? "https://eu-test.oppwa.com").replace(/\/$/, "");
    const params = new URLSearchParams({
      entityId: entity,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      paymentType: "DB",
      "customer.email": input.customer?.email ?? "",
      merchantTransactionId: input.orderNumber,
    });
    const res = await fetch(`${base}/v1/checkouts`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Bearer ${token}` },
      body: params.toString(),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HyperPay checkout failed: ${res.status}`);
    return { providerRef: String(raw.id ?? ""), status: "pending", raw };
  },

  async verifyWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    const decrypted = await decryptHyperPayWebhook(input);

    const type = String(decrypted.type ?? "");
    const payload = (decrypted.payload ?? {}) as Record<string, unknown>;

    const paymentId = String(payload.id ?? "");
    if (!paymentId) throw new Error("HyperPay webhook payload has no payment id.");

    if (type && type !== "PAYMENT") {
      // Registration/risk/test notifications: acknowledge without order effects.
      return {
        eventId: `${type.toLowerCase()}:${paymentId}`,
        providerRef: paymentId,
        status: "pending",
        amount: null,
        currency: null,
        orderReference: null,
        raw: { provider: "hyperpay", type, received_at: new Date().toISOString() },
      };
    }

    const result = (payload.result ?? {}) as Record<string, unknown>;
    const resultCode = String(result.code ?? "");
    const paymentType = String(payload.paymentType ?? "DB");
    const amountRaw = Number(payload.amount ?? NaN);

    return {
      eventId: paymentId,
      providerRef: paymentId,
      status: mapHyperPayStatus(resultCode, paymentType),
      amount: Number.isFinite(amountRaw) ? amountRaw : null,
      currency: payload.currency ? String(payload.currency).toUpperCase() : null,
      orderReference: payload.merchantTransactionId ? String(payload.merchantTransactionId) : null,
      raw: {
        provider: "hyperpay",
        received_at: new Date().toISOString(),
        type: type || "PAYMENT",
        result_code: resultCode,
        payment_type: paymentType,
        // The decrypted payload can carry card data references; persist only
        // the fields the processor needs.
        merchantTransactionId: payload.merchantTransactionId ?? null,
        id: paymentId,
        amount: payload.amount ?? null,
        currency: payload.currency ?? null,
      },
    };
  },
};
