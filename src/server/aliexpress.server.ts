import { createHmac } from "node:crypto";

const DEFAULT_ALIEXPRESS_ENDPOINT = "https://eco.taobao.com/router/rest";

type ParamValue = string | number | boolean | null | undefined;
type ParamMap = Record<string, ParamValue>;
type StringParamMap = Record<string, string>;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export function signAliExpressTopParams(
  params: StringParamMap,
  appSecret: string,
) {
  const canonical = Object.entries(params)
    .filter(([key]) => key !== "sign")
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([key, value]) => `${key}${value}`)
    .join("");

  return createHmac("md5", appSecret)
    .update(canonical, "utf8")
    .digest("hex")
    .toUpperCase();
}

export function buildAliExpressCommonParams(input: {
  appKey: string;
  session: string;
  method: string;
  timestamp: string;
}): StringParamMap {
  return {
    app_key: input.appKey,
    format: "json",
    method: input.method,
    session: input.session,
    sign_method: "hmac",
    timestamp: input.timestamp,
    v: "2.0",
  };
}

export function buildAliExpressRecommendationParams(input: {
  categoryId?: string;
  feedName?: string;
  page?: number;
  pageSize?: number;
  sort?:
    | "priceAsc"
    | "priceDesc"
    | "volumeAsc"
    | "volumeDesc"
    | "discountAsc"
    | "discountDesc"
    | "DSRratingAsc"
    | "DSRratingDesc";
}): StringParamMap {
  const pageSize = Math.max(1, Math.min(input.pageSize ?? 24, 50));
  const page = Math.max(1, input.page ?? 1);

  return compactParams({
    country: "SA",
    target_currency: "USD",
    target_language: "AR",
    page_size: pageSize,
    page_no: page,
    sort: input.sort ?? "volumeDesc",
    category_id: input.categoryId,
    feed_name: input.feedName ?? "DS bestseller",
  });
}

function compactParams(params: ParamMap): StringParamMap {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [key, String(value)]),
  );
}

function topTimestamp(date = new Date()) {
  const gmt8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${gmt8.getUTCFullYear()}-${pad(gmt8.getUTCMonth() + 1)}-${pad(gmt8.getUTCDate())} ${pad(gmt8.getUTCHours())}:${pad(gmt8.getUTCMinutes())}:${pad(gmt8.getUTCSeconds())}`;
}

function getAliExpressCredentials() {
  const appKey = process.env.ALIEXPRESS_APP_KEY?.trim();
  const appSecret = process.env.ALIEXPRESS_APP_SECRET?.trim();
  const session = process.env.ALIEXPRESS_SESSION?.trim();

  if (!appKey || !appSecret || !session) {
    throw new Error(
      "AliExpress is not connected. Configure ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, and ALIEXPRESS_SESSION as server-side secrets.",
    );
  }

  return { appKey, appSecret, session };
}

export function getAliExpressConfigurationStatus() {
  return {
    appKeyConfigured: Boolean(process.env.ALIEXPRESS_APP_KEY?.trim()),
    appSecretConfigured: Boolean(process.env.ALIEXPRESS_APP_SECRET?.trim()),
    sessionConfigured: Boolean(process.env.ALIEXPRESS_SESSION?.trim()),
    endpoint:
      process.env.ALIEXPRESS_API_ENDPOINT?.trim() || DEFAULT_ALIEXPRESS_ENDPOINT,
    country: "SA",
    language: "AR",
    supplierCurrency: "USD",
  };
}

export async function callAliExpressTop(
  method: string,
  businessParams: ParamMap = {},
  fetcher: typeof fetch = fetch,
): Promise<JsonObject> {
  const { appKey, appSecret, session } = getAliExpressCredentials();
  const common = buildAliExpressCommonParams({
    appKey,
    session,
    method,
    timestamp: topTimestamp(),
  });
  const params = { ...common, ...compactParams(businessParams) };
  const sign = signAliExpressTopParams(params, appSecret);
  const body = new URLSearchParams({ ...params, sign });
  const endpoint =
    process.env.ALIEXPRESS_API_ENDPOINT?.trim() || DEFAULT_ALIEXPRESS_ENDPOINT;

  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      Accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`AliExpress request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as JsonObject;
  const errorValue = payload.error_response;
  const error =
    errorValue && !Array.isArray(errorValue) && typeof errorValue === "object"
      ? errorValue
      : undefined;

  if (error) {
    const code = typeof error.code === "number" ? error.code : undefined;
    const subCode = typeof error.sub_code === "string" ? error.sub_code : undefined;
    const message = typeof error.msg === "string" ? error.msg : undefined;
    const subMessage = typeof error.sub_msg === "string" ? error.sub_msg : undefined;

    console.error("[AliExpress] API error", {
      method,
      code,
      subCode,
      message,
      subMessage,
    });
    throw new Error(
      `AliExpress rejected the request${subCode ? ` (${subCode})` : ""}. Check Dropshipper permissions and account authorization.`,
    );
  }

  return payload;
}

export function listAliExpressRecommendations(input: {
  categoryId?: string;
  feedName?: string;
  page?: number;
  pageSize?: number;
  sort?: Parameters<typeof buildAliExpressRecommendationParams>[0]["sort"];
}) {
  return callAliExpressTop("aliexpress.ds.recommend.feed.get", {
    ...buildAliExpressRecommendationParams(input),
  });
}

export function getAliExpressProduct(productId: string) {
  return callAliExpressTop("aliexpress.offer.ds.product.simplequery", {
    product_id: productId,
    local_country: "SA",
    local_language: "ar",
  });
}

export function quoteAliExpressFreight(input: {
  productId: string;
  quantity: number;
  priceUsd?: string;
  sendGoodsCountryCode?: string;
}) {
  return callAliExpressTop("aliexpress.logistics.buyer.freight.calculate", {
    param_aeop_freight_calculate_for_buyer_d_t_o: JSON.stringify({
      country_code: "SA",
      product_id: input.productId,
      product_num: input.quantity,
      send_goods_country_code: input.sendGoodsCountryCode ?? "CN",
      ...(input.priceUsd
        ? { price: input.priceUsd, price_currency: "USD" }
        : {}),
    }),
  });
}
