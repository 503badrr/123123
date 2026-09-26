import { afterEach, describe, expect, it, vi } from "vitest";
import { tap } from "./tap.server";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TAP_SECRET_KEY;
});

describe("Tap retrieveCharge", () => {
  it("retrieves and normalizes a Tap charge", async () => {
    process.env.TAP_SECRET_KEY = "sk_test_example";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "chg_123",
            status: "CAPTURED",
            amount: 125.5,
            currency: "SAR",
            reference: { order: "SW-1001" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const result = await tap.retrieveCharge!("chg_123");

    expect(result).toMatchObject({
      providerRef: "chg_123",
      status: "captured",
      providerStatus: "CAPTURED",
      amount: 125.5,
      currency: "SAR",
      orderReference: "SW-1001",
    });
  });

  it("rejects a response missing required reconciliation fields", async () => {
    process.env.TAP_SECRET_KEY = "sk_test_example";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "chg_123", status: "CAPTURED" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(tap.retrieveCharge!("chg_123")).rejects.toThrow(/required/i);
  });

  it("rejects a charge id mismatch", async () => {
    process.env.TAP_SECRET_KEY = "sk_test_example";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "chg_other",
            status: "CAPTURED",
            amount: 1,
            currency: "SAR",
            reference: { order: "SW-1" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(tap.retrieveCharge!("chg_123")).rejects.toThrow(/mismatch/i);
  });
});
