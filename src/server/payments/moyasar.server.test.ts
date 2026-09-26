import { afterEach, describe, expect, it, vi } from "vitest";

import { moyasar } from "./moyasar.server";

describe("Moyasar hosted checkout", () => {
  afterEach(() => {
    delete process.env.MOYASAR_SECRET_KEY;
    vi.restoreAllMocks();
  });

  it("creates a hosted Moyasar invoice and returns its checkout URL", async () => {
    process.env.MOYASAR_SECRET_KEY = "sk_test_example";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "inv_test_123",
          status: "initiated",
          amount: 2500,
          currency: "SAR",
          url: "https://checkout.moyasar.com/invoices/inv_test_123",
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await moyasar.createCharge({
      orderId: "order-1",
      orderNumber: "SW-1001",
      amount: 25,
      currency: "SAR",
      description: "Switch order SW-1001",
      callbackUrl: "https://swwiitch.com/success?id=SW-1001",
      customer: { name: "Badr Alsubaie", email: "badr@example.com", phone: "0500000000" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.moyasar.com/v1/invoices",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.providerRef).toBe("inv_test_123");
    expect(result.redirectUrl).toBe("https://checkout.moyasar.com/invoices/inv_test_123");
    expect(result.status).toBe("pending");
  });
});
