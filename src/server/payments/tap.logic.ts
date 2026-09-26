import type { CheckoutPaymentMethod, CreateChargeResult, WebhookEvent } from "./provider.server";

export function formatTapAmount(value: unknown, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error("Tap amount is invalid.");
  const normalizedCurrency = currency.toUpperCase();
  const decimals = ["BHD", "JOD", "KWD", "OMR"].includes(normalizedCurrency) ? 3 : 2;
  return amount.toFixed(decimals);
}

export function mapTapStatus(status: unknown): WebhookEvent["status"] {
  switch (String(status ?? "").toUpperCase()) {
    case "CAPTURED":
      return "captured";
    case "AUTHORIZED":
      return "authorized";
    case "REFUNDED":
      return "refunded";
    case "ABANDONED":
    case "CANCELLED":
    case "DECLINED":
    case "FAILED":
    case "RESTRICTED":
    case "TIMEDOUT":
    case "VOID":
    case "VOIDED":
      return "failed";
    case "INITIATED":
    case "IN_PROGRESS":
    case "PENDING":
    default:
      return "pending";
  }
}

export function mapCreateStatus(status: unknown): CreateChargeResult["status"] {
  const normalized = mapTapStatus(status);
  return normalized === "refunded" ? "failed" : normalized;
}

export function tapSourceId(
  paymentMethod: CheckoutPaymentMethod | undefined,
  currency: string,
  override?: string,
): string {
  const configuredOverride = override?.trim();
  if (configuredOverride) return configuredOverride;

  switch (paymentMethod) {
    case "mada":
      if (currency.toUpperCase() !== "SAR") {
        throw new Error("mada payments require SAR currency.");
      }
      return "src_sa.mada";
    case "visa":
    case "mastercard":
      return "src_card";
    case "apple-pay":
      return "src_apple_pay";
    default:
      return "src_all";
  }
}
