import { describe, expect, it } from "vitest";
import { validateReconciliationMatch } from "./reconcile.server";

const local = {
  orderNumber: "SW-1001",
  providerRef: "chg_123",
  amount: 125.5,
  currency: "SAR",
};

const remote = {
  providerRef: "chg_123",
  status: "captured" as const,
  providerStatus: "CAPTURED",
  amount: 125.5,
  currency: "SAR",
  orderReference: "SW-1001",
  raw: {},
};

describe("payment reconciliation guards", () => {
  it("accepts an exact payment match", () => {
    expect(() => validateReconciliationMatch(local, remote)).not.toThrow();
  });

  it("rejects provider charge mismatch", () => {
    expect(() =>
      validateReconciliationMatch(local, { ...remote, providerRef: "chg_other" }),
    ).toThrow(/charge/i);
  });

  it("rejects amount mismatch", () => {
    expect(() => validateReconciliationMatch(local, { ...remote, amount: 120 })).toThrow(/amount/i);
  });

  it("rejects currency mismatch", () => {
    expect(() => validateReconciliationMatch(local, { ...remote, currency: "USD" })).toThrow(/currency/i);
  });

  it("rejects order reference mismatch", () => {
    expect(() =>
      validateReconciliationMatch(local, { ...remote, orderReference: "SW-OTHER" }),
    ).toThrow(/order/i);
  });
});
