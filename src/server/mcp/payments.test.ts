import { describe, expect, it } from "vitest";
import { assertPaymentWriteAllowed, sanitizePaymentRecord } from "./payments.server";

describe("MCP payment boundary", () => {
  it("redacts raw payload and customer/card-like fields", () => {
    const safe = sanitizePaymentRecord({
      id: "pay_1",
      order_id: "ord_1",
      provider: "tap",
      provider_payment_id: "chg_1",
      status: "paid",
      amount: 50,
      currency: "SAR",
      created_at: "2026-08-26T00:00:00Z",
      updated_at: "2026-08-26T00:01:00Z",
      raw_payload: { card: { number: "4111111111111111" }, authorization: "Bearer secret" },
      customer_email: "private@example.com",
    });

    expect(safe).toEqual({
      id: "pay_1",
      orderId: "ord_1",
      provider: "tap",
      providerPaymentId: "chg_1",
      status: "paid",
      amount: 50,
      currency: "SAR",
      createdAt: "2026-08-26T00:00:00Z",
      updatedAt: "2026-08-26T00:01:00Z",
    });
    expect(JSON.stringify(safe)).not.toContain("411111");
    expect(JSON.stringify(safe)).not.toContain("private@example.com");
    expect(JSON.stringify(safe)).not.toContain("Bearer");
  });

  it("allows financial writes only for admin/owner with exact confirmation", () => {
    expect(() =>
      assertPaymentWriteAllowed({ userId: "u1", role: "admin" }, "CONFIRM_REFUND"),
    ).not.toThrow();
    expect(() => assertPaymentWriteAllowed({ userId: "u1", role: "viewer" }, "CONFIRM_REFUND"))
      .toThrow(/role/i);
    expect(() => assertPaymentWriteAllowed({ userId: "u1", role: "owner" }, "yes"))
      .toThrow(/confirmation/i);
  });
});
