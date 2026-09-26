import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tap } from "./tap.server";

const TEST_SECRET = "sk_test_switch_fixture";

function tapHash(payload: Record<string, any>, amount: string): string {
  const value =
    `x_id${payload.id}` +
    `x_amount${amount}` +
    `x_currency${payload.currency}` +
    `x_gateway_reference${payload.reference.gateway}` +
    `x_payment_reference${payload.reference.payment}` +
    `x_status${payload.status}` +
    `x_created${payload.transaction.created}`;
  return createHmac("sha256", TEST_SECRET).update(value, "utf8").digest("hex");
}

describe("Tap payment provider", () => {
  const originalSecret = process.env.TAP_SECRET_KEY;
  const originalSource = process.env.TAP_SOURCE_ID;
  const originalDescriptor = process.env.TAP_STATEMENT_DESCRIPTOR;

  beforeEach(() => {
    process.env.TAP_SECRET_KEY = TEST_SECRET;
    delete process.env.TAP_SOURCE_ID;
    delete process.env.TAP_STATEMENT_DESCRIPTOR;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();

    if (originalSecret === undefined) delete process.env.TAP_SECRET_KEY;
    else process.env.TAP_SECRET_KEY = originalSecret;

    if (originalSource === undefined) delete process.env.TAP_SOURCE_ID;
    else process.env.TAP_SOURCE_ID = originalSource;

    if (originalDescriptor === undefined) delete process.env.TAP_STATEMENT_DESCRIPTOR;
    else process.env.TAP_STATEMENT_DESCRIPTOR = originalDescriptor;
  });

  it("accepts a valid webhook hash and formats KWD with three decimals", async () => {
    const payload = {
      id: "chg_test_1",
      object: "charge",
      status: "CAPTURED",
      amount: 1,
      currency: "KWD",
      transaction: { created: "1698392202943" },
      reference: {
        gateway: "gateway-1",
        payment: "payment-1",
        order: "SW-1001",
      },
    };

    const event = await tap.verifyWebhook({
      rawBody: JSON.stringify(payload),
      headers: { hashstring: tapHash(payload, "1.000") },
    });

    expect(event).toMatchObject({
      eventId: "chg_test_1",
      providerRef: "chg_test_1",
      status: "captured",
      amount: 1,
      currency: "KWD",
      orderReference: "SW-1001",
    });
  });

  it("rejects an invalid webhook hash", async () => {
    await expect(
      tap.verifyWebhook({
        rawBody: JSON.stringify({
          id: "chg_test_2",
          amount: 1,
          currency: "SAR",
          status: "CAPTURED",
          transaction: { created: "1698392202943" },
          reference: { gateway: "gateway-2", payment: "payment-2" },
        }),
        headers: { hashstring: "0".repeat(64) },
      }),
    ).rejects.toThrow("Invalid Tap hashstring.");
  });

  it("creates an explicit hosted mada charge with normalized customer data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chg_test_3",
          status: "INITIATED",
          transaction: { url: "https://sandbox.payments.tap.company/redirect" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await tap.createCharge({
      orderId: "bb5c5da4-e4e2-4de1-aa4d-01cc5a8a4890",
      orderNumber: "SW-1003",
      amount: 125.5,
      currency: "sar",
      description: "Switch order SW-1003",
      callbackUrl: "https://swwiitch.com/success?id=SW-1003",
      paymentMethod: "mada",
      customer: {
        name: "Majdi Abdullah",
        email: "MAJDI@EXAMPLE.COM",
        phone: "+966 51 234 5678",
      },
    });

    expect(result).toMatchObject({
      providerRef: "chg_test_3",
      status: "pending",
      redirectUrl: "https://sandbox.payments.tap.company/redirect",
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(request.body));

    expect(url).toBe("https://api.tap.company/v2/charges/");
    expect(request.headers).toMatchObject({
      authorization: `Bearer ${TEST_SECRET}`,
    });
    expect(body).toMatchObject({
      amount: 125.5,
      currency: "SAR",
      customer_initiated: true,
      threeDSecure: true,
      save_card: false,
      statement_descriptor: "Switch",
      metadata: { udf1: "bb5c5da4-e4e2-4de1-aa4d-01cc5a8a4890" },
      reference: { transaction: "SW-1003", order: "SW-1003" },
      customer: {
        first_name: "Majdi",
        last_name: "Abdullah",
        email: "majdi@example.com",
        phone: { country_code: "966", number: "512345678" },
      },
      source: { id: "src_sa.mada" },
      post: { url: "https://swwiitch.com/api/public/webhooks/tap" },
    });
  });

  it("honors a server-side Tap source override", async () => {
    process.env.TAP_SOURCE_ID = "src_card";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chg_test_4",
          status: "INITIATED",
          transaction: { url: "https://sandbox.payments.tap.company/redirect" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await tap.createCharge({
      orderId: "e2e3ce92-452f-413e-a3a3-5dd927b9cd6a",
      orderNumber: "SW-1004",
      amount: 10,
      currency: "SAR",
      description: "Switch order SW-1004",
      callbackUrl: "https://swwiitch.com/success?id=SW-1004",
      paymentMethod: "mada",
      customer: {
        name: "Test Customer",
        email: "test@example.com",
        phone: "0512345678",
      },
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body)).source).toEqual({ id: "src_card" });
  });

  it("rejects a successful HTTP response without a Tap payment id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "INITIATED", transaction: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      tap.createCharge({
        orderId: "ec543a53-56d1-44f8-b67d-ee9336fd9dc0",
        orderNumber: "SW-1005",
        amount: 10,
        currency: "SAR",
        description: "Switch order SW-1005",
        callbackUrl: "https://swwiitch.com/success?id=SW-1005",
        customer: {
          name: "Test Customer",
          email: "test@example.com",
          phone: "0512345678",
        },
      }),
    ).rejects.toThrow("Tap charge response is missing its payment id.");
  });
});
