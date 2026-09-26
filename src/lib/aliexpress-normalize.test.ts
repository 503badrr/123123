import { describe, expect, it } from "vitest";
import { normalizeAliExpressRecommendations } from "./aliexpress-normalize";

describe("normalizeAliExpressRecommendations", () => {
  it("normalizes the documented direct result shape", () => {
    const products = normalizeAliExpressRecommendations({
      aliexpress_ds_recommend_feed_get_response: {
        result: {
          products: {
            integer: [
              {
                product_id: 4000102715995,
                target_sale_price: "12.50",
                evaluate_rate: "96.4%",
                lastest_volume: 1280,
                discount: "20%",
                product_title: "Wireless Car Charger",
                product_main_image_url: "https://example.com/p.jpg",
              },
            ],
          },
        },
      },
    });

    expect(products).toEqual([
      expect.objectContaining({
        productId: "4000102715995",
        title: "Wireless Car Charger",
        priceUsd: 12.5,
        ratingPercent: 96.4,
        orderVolume: 1280,
        discount: "20%",
      }),
    ]);
  });

  it("supports the resp_result wrapper returned by newer SDK examples", () => {
    const products = normalizeAliExpressRecommendations({
      aliexpress_ds_recommend_feed_get_response: {
        resp_result: {
          result: {
            products: {
              integer: [{ product_id: "1234567890", target_sale_price: "8.99" }],
            },
          },
        },
      },
    });

    expect(products[0]?.productId).toBe("1234567890");
    expect(products[0]?.priceUsd).toBe(8.99);
  });
});
