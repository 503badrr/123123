import { createServerFn } from "@tanstack/react-start";
import type { CheckoutPaymentMethod, ProviderName } from "@/server/payments/provider.server";

type CapabilityConfig = {
  configured: boolean;
  applePayEnabled: boolean;
};

export function resolvePaymentCapabilities(
  provider: ProviderName,
  currency: string,
  config: CapabilityConfig,
): CheckoutPaymentMethod[] {
  if (!config.configured) return [];

  const normalizedCurrency = currency.toUpperCase();
  if (provider === "tap") {
    const methods: CheckoutPaymentMethod[] = [];
    if (normalizedCurrency === "SAR") methods.push("mada");
    methods.push("visa", "mastercard");
    if (config.applePayEnabled) methods.push("apple-pay");
    return methods;
  }

  if (provider === "moyasar") {
    return normalizedCurrency === "SAR"
      ? ["mada", "visa", "mastercard"]
      : ["visa", "mastercard"];
  }

  if (provider === "telr") return ["visa", "mastercard"];
  return [];
}

function enabledFlag(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

export const getCheckoutPaymentCapabilities = createServerFn({ method: "GET" }).handler(async () => {
  const { getProvider } = await import("@/server/payments/provider.server");
  const provider = await getProvider();
  const currency = "SAR";
  const methods = resolvePaymentCapabilities(provider.name, currency, {
    configured: provider.isConfigured(),
    applePayEnabled: provider.name === "tap" && enabledFlag(process.env.TAP_APPLE_PAY_ENABLED),
  });

  return {
    provider: provider.name,
    currency,
    methods,
  };
});
