import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CART_FRAGMENT,
  CART_LINE_FRAGMENT,
  GET_COLLECTION_BY_HANDLE_QUERY,
  GET_CUSTOMER_ORDERS_QUERY,
  GET_PRODUCT_BY_HANDLE_QUERY,
  GET_SHOP_INFO_QUERY,
  GET_VARIANT_AVAILABILITY_QUERY,
  PRODUCT_FRAGMENT,
} from "./queries";

const clientSource = readFileSync("src/lib/shopify/client.ts", "utf8");
const serverSource = readFileSync("src/server/shopify.server.ts", "utf8");
const productsHookSource = readFileSync("src/hooks/useProducts.ts", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const productionEnvExample = readFileSync(".env.production.example", "utf8");
const wranglerConfig = readFileSync("wrangler.jsonc", "utf8");
const mcpConfig = readFileSync(".vscode/mcp.json", "utf8");

describe("Shopify production readiness", () => {
  it("uses Vite-safe public Shopify environment names in browser code", () => {
    expect(clientSource).toContain("import.meta.env.VITE_SHOPIFY_STORE_DOMAIN");
    expect(clientSource).toContain("import.meta.env.VITE_SHOPIFY_STOREFRONT_API_TOKEN");
    expect(clientSource).not.toContain("import.meta.env.PUBLIC_STORE_DOMAIN");
    expect(clientSource).not.toContain("import.meta.env.PUBLIC_STOREFRONT_API_TOKEN");
  });

  it("pins the Storefront API to the current stable 2026-07 contract", () => {
    expect(clientSource).toContain("2026-07");
    expect(serverSource).toContain("2026-07");
    expect(clientSource).not.toContain("2024-07");
    expect(serverSource).not.toContain("2024-07");
  });

  it("uses Shopify's private-token header only on the server", () => {
    expect(serverSource).toContain('"Shopify-Storefront-Private-Token"');
    expect(serverSource).not.toMatch(/"X-Shopify-Storefront-Access-Token"\s*:\s*token/);
    expect(clientSource).not.toContain("Shopify-Storefront-Private-Token");
  });

  it("fails closed for the privileged proxy unless explicitly enabled", () => {
    expect(serverSource).toContain("SHOPIFY_PRIVILEGED_PROXY_ENABLED");
    expect(serverSource).toContain('!== "1"');
    expect(serverSource).toContain('request.headers.get("origin")');
    expect(serverSource).toContain('request.headers.get("cf-connecting-ip")');
  });

  it("validates untrusted JSON before treating it as a Shopify request", () => {
    expect(serverSource).toContain("const rawBody = await readJsonBodyWithLimit(request)");
    expect(serverSource).toContain("parseGraphQLRequestBody(rawBody)");
    expect(serverSource).not.toContain("await request.json()");
    expect(serverSource).not.toContain("(await request.json()) as ShopifyGraphQLRequestBody");
    expect(serverSource).not.toContain('if (operationName === "GetCustomerOrders")');
  });

  it("enforces the privileged request body limit even without Content-Length", () => {
    expect(serverSource).toContain("request.body.getReader()");
    expect(serverSource).toContain("bytesRead > MAX_REQUEST_BYTES");
    expect(serverSource).toContain("reader.cancel()");
  });

  it("never forwards a caller-controlled privileged GraphQL document", () => {
    expect(serverSource).toContain("GET_CUSTOMER_ORDERS_QUERY");
    expect(serverSource).toContain("query: GET_CUSTOMER_ORDERS_QUERY");
    expect(serverSource).not.toContain("query: body.query");
  });

  it("uses null-safe GraphQL data validation", () => {
    expect(clientSource).toContain("result.data === undefined || result.data === null");
    expect(clientSource).not.toContain("if (!result.data)");
  });

  it("avoids non-null assertions when accumulating variant options", () => {
    expect(productsHookSource).not.toContain("optionsMap.get(option.name)!");
  });

  it("rejects non-finite Shopify money values before arithmetic or formatting", () => {
    expect(productsHookSource).toContain("function parseFiniteMoneyAmount");
    expect(productsHookSource).toContain("Number.isFinite(parsed)");
    expect(productsHookSource).toContain("if (minPrice === null || maxPrice === null)");
  });

  it("uses an explicit comparator for deterministic option sorting", () => {
    expect(productsHookSource).toContain(".sort((a, b) => a.localeCompare(b))");
    expect(productsHookSource).not.toContain("Array.from(values).sort()");
  });

  it("targets the current ProductVariant availability field while preserving the local shape", () => {
    for (const document of [PRODUCT_FRAGMENT, CART_LINE_FRAGMENT, GET_VARIANT_AVAILABILITY_QUERY]) {
      expect(document).toContain("available: availableForSale");
      expect(document).not.toMatch(/\n\s+available\s*\n/);
    }
  });

  it("uses node(id:) for Storefront ProductVariant lookup", () => {
    expect(GET_VARIANT_AVAILABILITY_QUERY).toContain("node(id: $id)");
    expect(GET_VARIANT_AVAILABILITY_QUERY).toContain("... on ProductVariant");
    expect(GET_VARIANT_AVAILABILITY_QUERY).not.toContain("productVariant(id:");
  });

  it("does not request Product metafields with the removed connection arguments", () => {
    expect(PRODUCT_FRAGMENT).not.toContain("metafields(first:");
  });

  it("uses current handle-based product and collection queries", () => {
    expect(GET_PRODUCT_BY_HANDLE_QUERY).toContain("product(handle: $handle)");
    expect(GET_PRODUCT_BY_HANDLE_QUERY).not.toContain("productByHandle");
    expect(GET_COLLECTION_BY_HANDLE_QUERY).toContain("collection(handle: $handle)");
    expect(GET_COLLECTION_BY_HANDLE_QUERY).not.toContain("collectionByHandle");
  });

  it("does not request removed or deprecated Storefront fields", () => {
    expect(GET_SHOP_INFO_QUERY).not.toContain("currencyCode");
    expect(CART_FRAGMENT).not.toContain("totalTaxAmount");
    expect(CART_FRAGMENT).not.toContain("totalDutyAmount");
    expect(GET_CUSTOMER_ORDERS_QUERY).not.toContain(
      "nodes {\n              id\n              title\n              quantity"
    );
  });

  it("reads current product and collection response keys in React Query hooks", () => {
    expect(productsHookSource).toContain("{ product: ShopifyProduct | null }");
    expect(productsHookSource).toContain("return response.product;");
    expect(productsHookSource).toContain("collection: ShopifyCollection | null;");
    expect(productsHookSource).toContain("return response.collection;");
    expect(productsHookSource).not.toContain("response.productByHandle");
    expect(productsHookSource).not.toContain("response.collectionByHandle");
  });

  it("retrieves customer orders with a customer access token rather than a customer id", () => {
    expect(GET_CUSTOMER_ORDERS_QUERY).toContain("$customerAccessToken: String!");
    expect(GET_CUSTOMER_ORDERS_QUERY).toContain(
      "customer(customerAccessToken: $customerAccessToken)"
    );
    expect(GET_CUSTOMER_ORDERS_QUERY).not.toContain("customer(id:");
  });

  it("keeps one Cloudflare Worker deployment contract", () => {
    expect(existsSync("wrangler.toml")).toBe(false);
    expect(wranglerConfig).toContain('"name": "dark-disk-4155"');
    expect(wranglerConfig).toContain('"workers_dev": false');
    expect(wranglerConfig).toContain('"pattern": "swwiitch.com"');
    expect(wranglerConfig).toContain('"pattern": "www.swwiitch.com"');
    expect(wranglerConfig).not.toContain("PRIVATE_STOREFRONT_API_TOKEN");
  });

  it("documents build-time public values separately from runtime private values", () => {
    for (const example of [envExample, productionEnvExample]) {
      expect(example).toContain("VITE_SHOPIFY_STORE_DOMAIN=");
      expect(example).toContain("VITE_SHOPIFY_STOREFRONT_API_TOKEN=");
      expect(example).toContain("SHOPIFY_STORE_DOMAIN=");
      expect(example).toContain("PRIVATE_STOREFRONT_API_TOKEN=");
    }
  });

  it("keeps the Zid MCP credential out of committed workspace configuration", () => {
    expect(mcpConfig).toContain('"url": "${env:ZID_MCP_URL}"');
    expect(mcpConfig).not.toContain("zam-mcp-server.zid.sa/mcp/");
  });
});