import { describe, expect, it } from "vitest";
import { buildZidEventId, handleZidWebhook } from "./webhook.server";

const env = {
  ZID_WEBHOOK_USERNAME: "switch-zid",
  ZID_WEBHOOK_PASSWORD: "secret-value",
};

function authHeader(): string {
  return `Basic ${btoa("switch-zid:secret-value")}`;
}

function request(
  event: string,
  body: unknown,
  authorization = authHeader(),
  contentType = "application/json"
): Request {
  return new Request(`https://swwiitch.com/api/zid/webhooks?event=${encodeURIComponent(event)}`, {
    method: "POST",
    headers: {
      authorization,
      "content-type": contentType,
    },
    body: JSON.stringify(body),
  });
}

describe("Zid webhook ingress", () => {
  it("rejects missing or invalid Basic authentication", async () => {
    const response = await handleZidWebhook(
      request("order.create", { id: 10 }, "Basic bad"),
      env,
      async () => true
    );
    expect(response.status).toBe(401);
  });

  it("rejects unsupported events", async () => {
    const response = await handleZidWebhook(
      request("product.delete", { id: 10 }),
      env,
      async () => true
    );
    expect(response.status).toBe(400);
  });

  it("rejects non-json requests", async () => {
    const response = await handleZidWebhook(
      request("order.create", { id: 10 }, authHeader(), "text/plain"),
      env,
      async () => true
    );
    expect(response.status).toBe(415);
  });

  it("creates a deterministic idempotency key for the same event payload", async () => {
    const payload = { id: 987, updated_at: "2026-09-10T00:00:00Z", payment_status: "paid" };
    const first = await buildZidEventId("order.payment_status.update", payload);
    const second = await buildZidEventId("order.payment_status.update", payload);
    expect(first).toBe(second);
    expect(first).toMatch(/^order\.payment_status\.update:987:/);
  });

  it("persists an authenticated order event without triggering fulfillment", async () => {
    const seen: Array<{ event: string; eventId: string; payload: unknown }> = [];
    const response = await handleZidWebhook(
      request("order.create", { id: 123, created_at: "2026-09-10T00:00:00Z" }),
      env,
      async (event) => {
        seen.push(event);
        return true;
      }
    );

    expect(response.status).toBe(202);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.event).toBe("order.create");
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body).not.toHaveProperty("code");
    expect(body).not.toHaveProperty("fulfillment");
  });

  it("acknowledges duplicate deliveries without recording them twice", async () => {
    const response = await handleZidWebhook(
      request("order.status.update", { id: 123, updated_at: "2026-09-10T00:01:00Z" }),
      env,
      async () => false
    );

    expect(response.status).toBe(202);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.duplicate).toBe(true);
  });
});