import { afterEach, describe, expect, it, vi } from "vitest";
import { handleShopifyPrivilegedRequest } from "./shopify.server";

const originalProxyFlag = process.env.SHOPIFY_PRIVILEGED_PROXY_ENABLED;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalProxyFlag === undefined) {
    delete process.env.SHOPIFY_PRIVILEGED_PROXY_ENABLED;
  } else {
    process.env.SHOPIFY_PRIVILEGED_PROXY_ENABLED = originalProxyFlag;
  }
});

describe("Shopify privileged request body limits", () => {
  it("preserves the 413 response when stream cancellation rejects", async () => {
    process.env.SHOPIFY_PRIVILEGED_PROXY_ENABLED = "1";

    const oversizedChunk = new Uint8Array(32 * 1024 + 1);
    const read = vi.fn().mockResolvedValueOnce({ done: false, value: oversizedChunk });
    const cancel = vi.fn().mockRejectedValueOnce(new Error("cancel failed"));
    const releaseLock = vi.fn();

    const request = {
      url: "https://swwiitch.com/api/shopify/graphql",
      headers: new Headers({
        origin: "https://swwiitch.com",
        "content-type": "application/json",
      }),
      body: {
        getReader: () => ({ read, cancel, releaseLock }),
      },
    } as unknown as Request;

    const response = await handleShopifyPrivilegedRequest(request);
    const payload = (await response.json()) as { errors?: Array<{ message?: string }> };

    expect(response.status).toBe(413);
    expect(payload.errors?.[0]?.message).toBe("Request body is too large");
    expect(read).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });
});
