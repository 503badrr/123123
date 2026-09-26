import type {
  ShopifyProductForZid,
  ZidConfig,
  ZidProductListResponse,
  ZidProductWritePayload,
} from "./types";

const DEFAULT_ZID_API_BASE_URL = "https://api.zid.sa/v1";

function requireEnvValue(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, "");
  const url = new URL(normalized);
  if (url.protocol !== "https:") {
    throw new Error("ZID_API_BASE_URL must use https");
  }
  return url.toString().replace(/\/$/, "");
}

export function getZidConfig(
  env: Record<string, string | undefined> = process.env
): ZidConfig {
  const authorizationToken = requireEnvValue(env, "ZID_AUTHORIZATION_TOKEN");
  const managerToken = requireEnvValue(env, "ZID_MANAGER_TOKEN");
  const storeId = requireEnvValue(env, "ZID_STORE_ID");
  const baseUrl = normalizeBaseUrl(env.ZID_API_BASE_URL ?? DEFAULT_ZID_API_BASE_URL);

  return {
    authorizationToken,
    managerToken,
    storeId,
    baseUrl,
    writesEnabled: env.ZID_SYNC_WRITES_ENABLED === "1",
  };
}

export function buildZidManagerHeaders(config: ZidConfig): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Language": "ar",
    "Content-Type": "application/json",
    Authorization: config.authorizationToken,
    "X-Manager-Token": config.managerToken,
    "Access-Token": config.managerToken,
    "Store-Id": config.storeId,
    Role: "Manager",
  };
}

function parseFinitePrice(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${label} price`);
  }
  return parsed;
}

function inferProductClass(product: ShopifyProductForZid): "voucher" | "downloadable" {
  const normalizedType = product.productType.toLowerCase();
  const normalizedTags = product.tags.map((tag) => tag.toLowerCase());
  if (normalizedType.includes("download") || normalizedTags.includes("downloadable")) {
    return "downloadable";
  }
  return "voucher";
}

export function mapShopifyProductToZid(product: ShopifyProductForZid): ZidProductWritePayload {
  const sku = product.variant.sku?.trim();
  if (!sku) {
    throw new Error("Shopify SKU is required for Zid synchronization");
  }

  const price = parseFinitePrice(product.variant.price, "product");
  const compareAtPrice = product.variant.compareAtPrice
    ? parseFinitePrice(product.variant.compareAtPrice, "compare-at")
    : null;
  const hasDiscount = compareAtPrice !== null && compareAtPrice > price;
  const regularPrice = hasDiscount ? compareAtPrice : price;
  const salePrice = hasDiscount ? price : null;

  return {
    name: { ar: product.title, en: product.title },
    description: { ar: product.description, en: product.description },
    short_description: {
      ar: product.description.slice(0, 240),
      en: product.description.slice(0, 240),
    },
    sku,
    price: regularPrice,
    sale_price: salePrice,
    product_class: inferProductClass(product),
    requires_shipping: false,
    is_draft: true,
    is_published: false,
  };
}

export function requireZidWritesEnabled(config: ZidConfig): void {
  if (!config.writesEnabled) {
    throw new Error("Zid writes are disabled; set ZID_SYNC_WRITES_ENABLED=1 after live-read verification");
  }
}

async function zidRequest<T>(
  path: string,
  init: RequestInit,
  config: ZidConfig = getZidConfig()
): Promise<T> {
  const headers = new Headers(buildZidManagerHeaders(config));
  const additionalHeaders = new Headers(init.headers);
  additionalHeaders.forEach((value, key) => headers.set(key, value));

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Zid API request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listZidProducts(
  page = 1,
  pageSize = 15,
  config: ZidConfig = getZidConfig()
): Promise<ZidProductListResponse> {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  return zidRequest<ZidProductListResponse>(
    `/products/?page=${safePage}&page_size=${safePageSize}`,
    { method: "GET" },
    config
  );
}

export async function createZidProduct(
  payload: ZidProductWritePayload,
  config: ZidConfig = getZidConfig()
): Promise<unknown> {
  requireZidWritesEnabled(config);
  return zidRequest("/products/", { method: "POST", body: JSON.stringify(payload) }, config);
}

export async function updateZidProduct(
  productId: string,
  payload: Partial<ZidProductWritePayload>,
  config: ZidConfig = getZidConfig()
): Promise<unknown> {
  requireZidWritesEnabled(config);
  const normalizedId = productId.trim();
  if (!/^[0-9a-f-]{36}$/i.test(normalizedId)) {
    throw new Error("Invalid Zid product id");
  }
  return zidRequest(
    `/products/${encodeURIComponent(normalizedId)}/`,
    { method: "PATCH", body: JSON.stringify(payload) },
    config
  );
}
