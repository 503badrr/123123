import { describe, expect, it } from "vitest";
import { resolvePaymentCapabilities } from "./payment-capabilities.functions";

describe("checkout payment capabilities", () => {
  it("keeps mada and cards available for configured Tap SAR checkout", () => {
    expect(
      resolvePaymentCapabilities("tap", "SAR", { configured: true, applePayEnabled: false }),
    ).toEqual(["mada", "visa", "mastercard"]);
  });

  it("exposes Apple Pay only when explicitly enabled", () => {
    expect(
      resolvePaymentCapabilities("tap", "SAR", { configured: true, applePayEnabled: true }),
    ).toEqual(["mada", "visa", "mastercard", "apple-pay"]);
  });

  it("does not expose mada for non-SAR checkout", () => {
    expect(
      resolvePaymentCapabilities("tap", "USD", { configured: true, applePayEnabled: true }),
    ).toEqual(["visa", "mastercard", "apple-pay"]);
  });

  it("returns no methods when the active provider is not configured", () => {
    expect(
      resolvePaymentCapabilities("tap", "SAR", { configured: false, applePayEnabled: true }),
    ).toEqual([]);
  });
});
