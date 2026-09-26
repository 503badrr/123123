// Payment Provider Abstraction Layer (server-only)
// Adapters are loaded dynamically inside handlers; keys read via env at call time.

export type ProviderName = "moyasar" | "hyperpay" | "tap" | "telr";
export type CheckoutPaymentMethod = "mada" | "visa" | "mastercard" | "apple-pay";
export type RefundReason = "duplicate" | "fraudulent" | "requested_by_customer";

export interface CreateChargeInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  customer?: { name?: string; email?: string; phone?: string };
  paymentMethod?: CheckoutPaymentMethod;
}

export interface CreateChargeResult {
  providerRef: string;
  status: "pending" | "authorized" | "captured" | "failed";
  redirectUrl?: string;
  raw: unknown;
}

export interface RetrievedCharge {
  providerRef: string;
  status: "captured" | "failed" | "authorized" | "pending" | "refunded";
  providerStatus: string;
  amount: number;
  currency: string;
  orderReference: string;
  raw: unknown;
}

export interface CreateRefundInput {
  providerPaymentId: string;
  amount: number;
  currency: string;
  reason: RefundReason;
  merchantReference: string;
  metadata?: Record<string, string>;
}

export interface CreateRefundResult {
  providerRefundId: string;
  status: "pending" | "refunded" | "failed";
  providerStatus: string;
  amount: number;
  currency: string;
  raw: unknown;
}

export interface VerifyWebhookInput {
  rawBody: string;
  headers: Record<string, string>;
}

export interface WebhookEvent {
  eventId: string;
  providerRef: string;
  status: "captured" | "failed" | "authorized" | "pending" | "refunded";
  raw: unknown;
  amount?: number | null;
  currency?: string | null;
  orderReference?: string | null;
}

export interface PaymentProvider {
  name: ProviderName;
  isConfigured(): boolean;
  modeLabel(): "Not configured" | "Sandbox ready" | "Live ready" | "Error";
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<WebhookEvent>;
  retrieveCharge?(providerRef: string): Promise<RetrievedCharge>;
  createRefund?(input: CreateRefundInput): Promise<CreateRefundResult>;
}

export function isHostedCheckoutProviderSupported(name: ProviderName): boolean {
  return name === "moyasar" || name === "tap" || name === "telr";
}

export function getActiveProviderName(): ProviderName {
  const raw = (process.env.PAYMENT_PROVIDER ?? "moyasar").toLowerCase();
  if (raw === "hyperpay" || raw === "tap" || raw === "moyasar" || raw === "telr") return raw;
  return "moyasar";
}

export async function getProvider(name?: ProviderName): Promise<PaymentProvider> {
  const target = name ?? getActiveProviderName();
  switch (target) {
    case "moyasar": {
      const { moyasar } = await import("./moyasar.server");
      return moyasar;
    }
    case "hyperpay": {
      const { hyperpay } = await import("./hyperpay.server");
      return hyperpay;
    }
    case "tap": {
      const { tap } = await import("./tap.server");
      return tap;
    }
    case "telr": {
      const { telr } = await import("./telr.server");
      return telr;
    }
  }
}

export function providerStatusForAll(): Array<{
  name: ProviderName;
  status: "Not configured" | "Sandbox ready" | "Live ready" | "Error";
}> {
  const names: ProviderName[] = ["moyasar", "hyperpay", "tap", "telr"];
  return names.map((name) => {
    try {
      const has =
        name === "moyasar"
          ? !!process.env.MOYASAR_SECRET_KEY
          : name === "hyperpay"
            ? !!(process.env.HYPERPAY_ACCESS_TOKEN && process.env.HYPERPAY_ENTITY_ID)
            : name === "tap"
              ? !!process.env.TAP_SECRET_KEY
              : !!(process.env.TELR_STORE_ID ?? process.env.TELR_STORE) && !!process.env.TELR_AUTH_KEY;
      if (!has) return { name, status: "Not configured" as const };
      const looksLive =
        (name === "moyasar" && /^sk_live_/.test(process.env.MOYASAR_SECRET_KEY ?? "")) ||
        (name === "tap" && /^sk_live_/.test(process.env.TAP_SECRET_KEY ?? "")) ||
        (name === "telr" &&
          ["0", "live", "production"].includes(
            (process.env.TELR_TEST_MODE ?? process.env.TELR_MODE ?? "").toLowerCase(),
          ));
      return { name, status: looksLive ? ("Live ready" as const) : ("Sandbox ready" as const) };
    } catch {
      return { name, status: "Error" };
    }
  });
}
