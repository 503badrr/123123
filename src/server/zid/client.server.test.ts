import { describe, expect, it } from "vitest";
import {
  buildZidManagerHeaders,
  getZidConfig,
  mapShopifyProductToZid,
  requireZidWritesEnabled,
} from "./client.server";

describe("Zid server client", () => {
  it("fails closed when required runtime credentials are missing", () => {
    expect(() => getZidConfig({})).toThrow(/ZID_AUTHORIZATION_TOKEN/);
  });

  it("normalizes the API base URL and never exposes browser-prefixed credentials", () => {
    const config = getZidConfig({
      ZID_AUTHORIZATION_TOKEN: "Bearer auth-token",
      ZID_MANAGER_TOKEN: "manager-token",
      ZID_STORE_ID: "store-id",
      ZID_API_BASE_URL: "https://api.zid.sa/v1/",
      ZID_SYNC_WRITES_ENABLED: "0",
    });

    expect(config.baseUrl).toBe("https://api.zid.sa/v1");
    expect(config.writesEnabled).toBe(false);
    expect(Object.keys(config).join(" ")).not.toContain("VITE_");
  });

  it("builds the manager headers required by Zid product endpoints", () => {
    const headers = buildZidManagerHeaders({
      authorizationToken: "Bearer auth-token",
      managerToken: "manager-token",
      storeId: "store-id",
      baseUrl: "https://api.zid.sa/v1",
      writesEnabled: false,
    });

    expect(headers.Authorization).toBe("Bearer auth-token");
    expect(headers["X-Manager-Token"]).toBe("manager-token");
    expect(headers["Access-Token"]).toBe("manager-token");
    expect(headers["Store-Id"]).toBe("store-id");
    expect(headers.Role).toBe("Manager");
  });

  it("requires an exact non-empty Shopify SKU before mapping a product", () => {
    expect(() =>
      mapShopifyProductToZid({
        title: "بطاقة العاب",
        description: "كود رقمي",
        productType: "Digital",
        tags: [],
        variant: { sku: " ", price: "50.00", compareAtPrice: null },
      })
    ).toThrow(/SKU/);
  });

  it("maps code products to a safe unpublished Zid voucher payload", () => {
    const payload = mapShopifyProductToZid({
      title: "بطاقة العاب 50 ريال",
      description: "كود رقمي يتم تسليمه بعد الدفع",
      productType: "Digital Code",
      tags: ["gift-card"],
      variant: { sku: "SW-GAME-050", price: "50.00", compareAtPrice: "55.00" },
    });

    expect(payload.product_class).toBe("voucher");
    expect(payload.sku).toBe("SW-GAME-050");
    expect(payload.price).toBe(55);
    expect(payload.sale_price).toBe(50);
    expect(payload.requires_shipping).toBe(false);
    expect(payload.is_draft).toBe(true);
    expect(payload.is_published).toBe(false);
  });

  it("maps explicitly downloadable products to Zid downloadable class", () => {
    const payload = mapShopifyProductToZid({
      title: "ملف رقمي",
      description: "تنزيل رقمي",
      productType: "Download",
      tags: ["downloadable"],
      variant: { sku: "SW-DL-001", price: "15.00", compareAtPrice: null },
    });

    expect(payload.product_class).toBe("downloadable");
  });

  it("rejects non-finite prices", () => {
    expect(() =>
      mapShopifyProductToZid({
        title: "منتج",
        description: "منتج رقمي",
        productType: "Digital",
        tags: [],
        variant: { sku: "SW-001", price: "NaN", compareAtPrice: null },
      })
    ).toThrow(/price/i);
  });

  it("keeps Zid writes disabled unless explicitly enabled", () => {
    expect(() =>
      requireZidWritesEnabled({
        authorizationToken: "Bearer auth-token",
        managerToken: "manager-token",
        storeId: "store-id",
        baseUrl: "https://api.zid.sa/v1",
        writesEnabled: false,
      })
    ).toThrow(/ZID_SYNC_WRITES_ENABLED=1/);
  });
});