export type AliExpressRecommendation = {
  productId: string;
  title: string;
  priceUsd: number;
  originalPriceUsd: number | null;
  ratingPercent: number | null;
  orderVolume: number | null;
  discount: string | null;
  imageUrl: string | null;
};

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): AnyRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function toPercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function unwrapProducts(payload: unknown): unknown[] {
  const root = asRecord(payload)?.aliexpress_ds_recommend_feed_get_response;
  const rootRecord = asRecord(root);
  if (!rootRecord) return [];

  const directResult = asRecord(rootRecord.result);
  const wrappedResult = asRecord(asRecord(rootRecord.resp_result)?.result);
  const result = directResult ?? wrappedResult;
  const products = asRecord(result?.products)?.integer;

  return Array.isArray(products) ? products : [];
}

export function normalizeAliExpressRecommendations(
  payload: unknown,
): AliExpressRecommendation[] {
  return unwrapProducts(payload)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is AnyRecord => Boolean(entry))
    .map((entry) => {
      const productId = toStringValue(entry.product_id);
      const priceUsd = toNumber(entry.target_sale_price ?? entry.sale_price);
      if (!productId || priceUsd === null) return null;

      return {
        productId,
        title:
          toStringValue(entry.product_title) ??
          toStringValue(entry.product_name) ??
          `AliExpress ${productId}`,
        priceUsd,
        originalPriceUsd: toNumber(
          entry.target_original_price ?? entry.original_price,
        ),
        ratingPercent: toPercent(entry.evaluate_rate),
        orderVolume: toNumber(entry.lastest_volume ?? entry.volume),
        discount: toStringValue(entry.discount),
        imageUrl:
          toStringValue(entry.product_main_image_url) ??
          toStringValue(entry.product_image_url) ??
          toStringValue(entry.image_url),
      } satisfies AliExpressRecommendation;
    })
    .filter((entry): entry is AliExpressRecommendation => Boolean(entry));
}
