import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getAliExpressConfigurationStatus,
  getAliExpressProduct,
  listAliExpressRecommendations,
  quoteAliExpressFreight,
} from "@/server/aliexpress.server";

const SortEnum = z.enum([
  "priceAsc",
  "priceDesc",
  "volumeAsc",
  "volumeDesc",
  "discountAsc",
  "discountDesc",
  "DSRratingAsc",
  "DSRratingDesc",
]);

export const getAliExpressStatus = createServerFn({ method: "GET" }).handler(
  async () => getAliExpressConfigurationStatus(),
);

export const getAliExpressRecommendations = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        categoryId: z.string().regex(/^\d+$/).max(32).optional(),
        feedName: z.string().min(1).max(80).optional(),
        page: z.number().int().min(1).max(100).optional(),
        pageSize: z.number().int().min(1).max(50).optional(),
        sort: SortEnum.optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => listAliExpressRecommendations(data));

export const getAliExpressProductDetails = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ productId: z.string().regex(/^\d{5,20}$/) }).parse(input),
  )
  .handler(async ({ data }) => getAliExpressProduct(data.productId));

export const getAliExpressFreightQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().regex(/^\d{5,20}$/),
        quantity: z.number().int().min(1).max(100),
        priceUsd: z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional(),
        sendGoodsCountryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => quoteAliExpressFreight(data));
