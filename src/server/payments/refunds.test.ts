import { describe, expect, it } from "vitest";
import { validateRefundRequest } from "./refunds.server";

const payment = {
  amount: 100,
  currency: "SAR",
  status: "paid",
  refundedAmount: 25,
};

describe("refund validation", () => {
  it("accepts a valid partial refund", () => {
    expect(() =>
      validateRefundRequest(payment, { amount: 25, reason: "requested_by_customer" }),
    ).not.toThrow();
  });

  it("accepts the remaining full refundable balance", () => {
    expect(() =>
      validateRefundRequest(payment, { amount: 75, reason: "duplicate" }),
    ).not.toThrow();
  });

  it("rejects refunds larger than the remaining captured amount", () => {
    expect(() =>
      validateRefundRequest(payment, { amount: 75.01, reason: "requested_by_customer" }),
    ).toThrow(/exceed/i);
  });

  it("rejects refunds for unpaid payments", () => {
    expect(() =>
      validateRefundRequest({ ...payment, status: "pending" }, { amount: 10, reason: "duplicate" }),
    ).toThrow(/paid/i);
  });

  it("rejects unsupported reasons", () => {
    expect(() =>
      validateRefundRequest(payment, { amount: 10, reason: "other" as never }),
    ).toThrow(/reason/i);
  });
});
