import { describe, expect, it } from "vitest";
import { calculateSourcingPrice, scoreSourcingCandidate } from "./sourcing-pricing";

describe("calculateSourcingPrice", () => {
  it("converts supplier and shipping USD costs to SAR and protects target margin", () => {
    const result = calculateSourcingPrice({
      supplierCostUsd: 10,
      shippingUsd: 2,
      targetMarginPct: 35,
      paymentFeePct: 3,
      marketingReservePct: 5,
    });

    expect(result.landedCostSar).toBe(45);
    expect(result.recommendedPriceSar).toBe(79);
    expect(result.estimatedProfitSar).toBeGreaterThan(27);
    expect(result.estimatedMarginPct).toBeGreaterThanOrEqual(35);
  });

  it("rejects impossible margin/fee combinations", () => {
    expect(() =>
      calculateSourcingPrice({
        supplierCostUsd: 5,
        shippingUsd: 1,
        targetMarginPct: 80,
        paymentFeePct: 15,
        marketingReservePct: 10,
      }),
    ).toThrow(/pricing rates/i);
  });
});

describe("scoreSourcingCandidate", () => {
  it("rates a strong Saudi-market candidate as excellent", () => {
    const result = scoreSourcingCandidate({
      ratingPercent: 96,
      orderVolume: 1200,
      deliveryDays: 9,
      estimatedMarginPct: 42,
      shippingSharePct: 18,
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.verdict).toBe("excellent");
  });

  it("flags a slow, low-margin candidate for rejection", () => {
    const result = scoreSourcingCandidate({
      ratingPercent: 82,
      orderVolume: 25,
      deliveryDays: 28,
      estimatedMarginPct: 16,
      shippingSharePct: 55,
    });

    expect(result.score).toBeLessThan(50);
    expect(result.verdict).toBe("reject");
  });
});
