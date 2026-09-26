export type SourcingPricingInput = {
  supplierCostUsd: number;
  shippingUsd: number;
  usdToSar?: number;
  targetMarginPct: number;
  paymentFeePct: number;
  marketingReservePct: number;
};

export type SourcingPricingResult = {
  landedCostSar: number;
  recommendedPriceSar: number;
  estimatedProfitSar: number;
  estimatedMarginPct: number;
  shippingSharePct: number;
};

function assertPercent(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value >= 100) {
    throw new Error(`${label} must be between 0 and 100.`);
  }
}

export function calculateSourcingPrice(
  input: SourcingPricingInput,
): SourcingPricingResult {
  const usdToSar = input.usdToSar ?? 3.75;
  const values = [input.supplierCostUsd, input.shippingUsd, usdToSar];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Sourcing costs must be finite non-negative numbers.");
  }
  if (usdToSar <= 0) throw new Error("USD to SAR rate must be greater than zero.");

  assertPercent(input.targetMarginPct, "Target margin");
  assertPercent(input.paymentFeePct, "Payment fee");
  assertPercent(input.marketingReservePct, "Marketing reserve");

  const protectedRate =
    (input.targetMarginPct + input.paymentFeePct + input.marketingReservePct) /
    100;
  if (protectedRate >= 0.95) {
    throw new Error("Pricing rates leave insufficient revenue to cover landed cost.");
  }

  const supplierCostSar = input.supplierCostUsd * usdToSar;
  const shippingCostSar = input.shippingUsd * usdToSar;
  const landedCostSar = supplierCostSar + shippingCostSar;
  const recommendedPriceSar = Math.ceil(landedCostSar / (1 - protectedRate));
  const paymentAndMarketing =
    recommendedPriceSar *
    ((input.paymentFeePct + input.marketingReservePct) / 100);
  const estimatedProfitSar =
    recommendedPriceSar - landedCostSar - paymentAndMarketing;
  const estimatedMarginPct =
    recommendedPriceSar === 0
      ? 0
      : (estimatedProfitSar / recommendedPriceSar) * 100;
  const shippingSharePct =
    landedCostSar === 0 ? 0 : (shippingCostSar / landedCostSar) * 100;

  return {
    landedCostSar: roundMoney(landedCostSar),
    recommendedPriceSar,
    estimatedProfitSar: roundMoney(estimatedProfitSar),
    estimatedMarginPct: roundPercent(estimatedMarginPct),
    shippingSharePct: roundPercent(shippingSharePct),
  };
}

export type SourcingCandidateScoreInput = {
  ratingPercent: number;
  orderVolume: number;
  deliveryDays: number;
  estimatedMarginPct: number;
  shippingSharePct: number;
};

export type SourcingCandidateVerdict = "excellent" | "test" | "reject";

export function scoreSourcingCandidate(input: SourcingCandidateScoreInput) {
  const score =
    ratingPoints(input.ratingPercent) +
    volumePoints(input.orderVolume) +
    deliveryPoints(input.deliveryDays) +
    marginPoints(input.estimatedMarginPct) +
    shippingPoints(input.shippingSharePct);

  const verdict: SourcingCandidateVerdict =
    score >= 80 ? "excellent" : score >= 60 ? "test" : "reject";

  return { score, verdict };
}

function ratingPoints(value: number) {
  if (value >= 95) return 25;
  if (value >= 90) return 20;
  if (value >= 85) return 12;
  return 4;
}

function volumePoints(value: number) {
  if (value >= 1000) return 20;
  if (value >= 300) return 15;
  if (value >= 100) return 10;
  if (value >= 30) return 5;
  return 2;
}

function deliveryPoints(value: number) {
  if (value <= 10) return 20;
  if (value <= 15) return 15;
  if (value <= 20) return 10;
  if (value <= 25) return 5;
  return 0;
}

function marginPoints(value: number) {
  if (value >= 40) return 25;
  if (value >= 35) return 20;
  if (value >= 25) return 12;
  if (value >= 20) return 7;
  return 0;
}

function shippingPoints(value: number) {
  if (value <= 20) return 10;
  if (value <= 30) return 8;
  if (value <= 40) return 4;
  return 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
