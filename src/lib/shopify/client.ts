/**
 * عميل Shopify GraphQL الآمن
 * يدير الاتصال بـ Shopify Storefront API.
 *
 * الأمان:
 * - القراءة وعمليات السلة تستخدم التوكن العام من المتصفح.
 * - العمليات المميزة تمر عبر مسار الخادم الداخلي فقط.
 * - التوكن الخاص لا يدخل حزمة المتصفح مطلقا.
 */

import type { GraphQLResponse } from "./types";

const STOREFRONT_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const PUBLIC_STOREFRONT_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_API_TOKEN;
const STOREFRONT_API_VERSION = "2026-07";

function normalizeStoreDomain(domain: string): string {
  const normalized = domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(normalized)) {
    throw new Error("VITE_SHOPIFY_STORE_DOMAIN must be a valid *.myshopify.com domain");
  }
  return normalized;
}

function requirePublicConfig(): { endpoint: string; token: string } {
  if (!STOREFRONT_DOMAIN || !PUBLIC_STOREFRONT_TOKEN) {
    throw new Error(
      "Shopify public configuration is missing: VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_API_TOKEN"
    );
  }

  const domain = normalizeStoreDomain(STOREFRONT_DOMAIN);
  return {
    endpoint: `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    token: PUBLIC_STOREFRONT_TOKEN,
  };
}

interface ExecuteOptions {
  endpoint: string;
  headers: Record<string, string>;
  credentials: RequestCredentials;
}

async function executeGraphQL<T = unknown>(
  query: string,
  variables: object | undefined,
  options: ExecuteOptions
): Promise<T> {
  try {
    const response = await fetch(options.endpoint, {
      method: "POST",
      headers: options.headers,
      body: JSON.stringify({ query, variables: variables ?? {} }),
      credentials: options.credentials,
    });

    if (!response.ok) {
      throw new Error(`Shopify API request failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors && result.errors.length > 0) {
      throw new Error(`Shopify GraphQL error: ${result.errors.map((e) => e.message).join(", ")}`);
    }

    if (result.data === undefined || result.data === null) {
      throw new Error("Shopify API returned no data");
    }

    return result.data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Shopify GraphQL request failed:", error);
    }
    throw error;
  }
}

export class ShopifyStorefrontClient {
  /** Public catalog/search requests. Configuration is resolved lazily per call. */
  async query<T = unknown>(query: string, variables?: object): Promise<T> {
    const { endpoint, token } = requirePublicConfig();
    return executeGraphQL<T>(query, variables, {
      endpoint,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      credentials: "omit",
    });
  }

  /** Cart mutations are safe with the public Storefront token. */
  async mutation<T = unknown>(query: string, variables?: object): Promise<T> {
    return this.query<T>(query, variables);
  }

  /**
   * Reserved for explicitly approved server-side operations.
   * The server proxy is disabled by default in production and must be enabled
   * deliberately with SHOPIFY_PRIVILEGED_PROXY_ENABLED=1.
   */
  async privileged<T = unknown>(query: string, variables?: object): Promise<T> {
    return executeGraphQL<T>(query, variables, {
      endpoint: "/api/shopify/graphql",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
    });
  }

  async getShop(): Promise<{ shop: { name: string; primaryDomain: { url: string } } }> {
    return this.query(
      `query GetShop {
        shop {
          name
          primaryDomain {
            url
          }
        }
      }`
    );
  }
}

export const shopifyClient = new ShopifyStorefrontClient();

export async function testShopifyConnection(): Promise<boolean> {
  try {
    const result = await shopifyClient.getShop();
    return result.shop.name.length > 0;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Shopify connection test failed:", error);
    }
    return false;
  }
}

export function logGraphQLError(operationName: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Shopify GraphQL Error] ${timestamp} - ${operationName}:`, message);
}

export function extractShopifyId(gid: string): string {
  return gid.split("/").pop() || gid;
}

export function buildShopifyId(
  type: "Product" | "ProductVariant" | "Cart" | "CartLine",
  id: string
): string {
  return `gid://shopify/${type}/${id}`;
}
