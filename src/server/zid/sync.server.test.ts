import { describe, expect, it } from "vitest";
import { syncShopifyProductToZid } from "./sync.server";
import type { ShopifyProductForZid, ZidProductListResponse, ZidProductWritePayload } from "./types";

const shopifyProduct: ShopifyProductForZid = {
  title: "بطاقة رقمية",
  description: "كود رقمي",
  productType: "Digital Code",
  tags: [],
  variant: { sku: "SW-100", price: "100.00", compareAtPrice: null },
};

function listResponse(sku?: string): ZidProductListResponse {
  return {
    results: sku
      ? [{ id: "11111111-1111-4111-8111-111111111111", product_class: "voucher", sku, name: { ar: "x" }, price: 100 }]
      : [],
    next: null,
  };
}

describe("Shopify to Zid sync", () => {
  it("dry-runs by default and performs no Zid write", async () => {
    let writes = 0;
    const result = await syncShopifyProductToZid(shopifyProduct, undefined, {
      list: async () => listResponse(),
      create: async () => { writes += 1; },
      update: async () => { writes += 1; },
    });

    expect(result.action).toBe("create");
    expect(result.executed).toBe(false);
    expect(writes).toBe(0);
  });

  it("updates only an exact matching SKU", async () => {
    let updatedId = "";
    const result = await syncShopifyProductToZid(shopifyProduct, { dryRun: false }, {
      list: async () => listResponse("SW-100"),
      create: async () => undefined,
      update: async (id: string, _payload: Partial<ZidProductWritePayload>) => { updatedId = id; },
    });

    expect(result.action).toBe("update");
    expect(result.executed).toBe(true);
    expect(updatedId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("creates when no exact SKU exists", async () => {
    let created = false;
    const result = await syncShopifyProductToZid(shopifyProduct, { dryRun: false }, {
      list: async () => listResponse("SW-100-OTHER"),
      create: async () => { created = true; },
      update: async () => undefined,
    });

    expect(result.action).toBe("create");
    expect(result.executed).toBe(true);
    expect(created).toBe(true);
  });
});