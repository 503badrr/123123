import { describe, expect, it } from "vitest";
import {
  buildAliExpressCommonParams,
  buildAliExpressRecommendationParams,
  signAliExpressTopParams,
} from "./aliexpress.server";

describe("AliExpress TOP integration", () => {
  it("generates the documented HMAC-MD5 TOP signature", () => {
    const params = {
      app_key: "12129701",
      format: "json",
      method: "aliexpress.offer.ds.product.simplequery",
      session: "test-session",
      sign_method: "hmac",
      timestamp: "2026-09-03 16:00:00",
      v: "2.0",
      local_country: "SA",
      local_language: "ar",
      product_id: "1307422965",
    };

    expect(signAliExpressTopParams(params, "test-secret")).toBe(
      "65C195EB2A63E4917D3ECD7E61A2997A",
    );
  });

  it("uses safe common TOP request defaults", () => {
    expect(
      buildAliExpressCommonParams({
        appKey: "app-key",
        session: "session-key",
        method: "aliexpress.ds.recommend.feed.get",
        timestamp: "2026-09-03 16:00:00",
      }),
    ).toEqual({
      app_key: "app-key",
      format: "json",
      method: "aliexpress.ds.recommend.feed.get",
      session: "session-key",
      sign_method: "hmac",
      timestamp: "2026-09-03 16:00:00",
      v: "2.0",
    });
  });

  it("targets Saudi Arabia and Arabic for sourcing recommendations", () => {
    expect(buildAliExpressRecommendationParams({})).toEqual({
      country: "SA",
      target_currency: "USD",
      target_language: "AR",
      page_size: "24",
      page_no: "1",
      sort: "volumeDesc",
      feed_name: "DS bestseller",
    });
  });

  it("caps recommendation page size at AliExpress' documented maximum", () => {
    expect(buildAliExpressRecommendationParams({ pageSize: 100 }).page_size).toBe("50");
  });
});
