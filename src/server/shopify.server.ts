import { GET_CUSTOMER_ORDERS_QUERY } from "@/lib/shopify/queries";

/**
 * Server-only Shopify Storefront transport for explicitly approved operations.
 *
 * The public catalog and cart path uses Shopify's public Storefront token in
 * the browser. This module exists only for operations that deliberately need a
 * private Storefront token. The proxy is disabled by default and fails closed.
 */

const STOREFRONT_API_VERSION = "2026-07";
const MAX_REQUEST_BYTES = 32 * 1024;
const ALLOWED_OPERATION_NAME = "GetCustomerOrders";

interface ShopifyGraphQLRequestBody {
  query: string;
  variables?: Record<string, unknown>;
}

interface CustomerOrdersVariables {
  customerAccessToken: string;
  first: number;
}

interface ShopifyGraphQLResult {
  data?: unknown;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGraphQLRequestBody(rawBody: unknown): ShopifyGraphQLRequestBody {
  if (!isRecord(rawBody)) {
    throw new HttpError(400, "GraphQL request body must be an object");
  }

  const query = rawBody.query;
  if (typeof query !== "string" || query.length < 1) {
    throw new HttpError(400, "Missing GraphQL query");
  }
  if (query.length > MAX_REQUEST_BYTES) {
    throw new HttpError(413, "GraphQL query is too large");
  }

  const variables = rawBody.variables;
  if (variables !== undefined && !isRecord(variables)) {
    throw new HttpError(400, "GraphQL variables must be an object");
  }

  return variables === undefined ? { query } : { query, variables };
}

function normalizeStoreDomain(domain: string): string {
  const normalized = domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(normalized)) {
    throw new Error("SHOPIFY_STORE_DOMAIN is invalid");
  }
  return normalized;
}

function requireStoreDomain(): string {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) {
    throw new Error("SHOPIFY_STORE_DOMAIN is not configured");
  }
  return normalizeStoreDomain(domain);
}

function requirePrivateToken(): string {
  const token = process.env.PRIVATE_STOREFRONT_API_TOKEN;
  if (!token) {
    throw new Error("PRIVATE_STOREFRONT_API_TOKEN is not configured");
  }
  return token;
}

function assertProxyEnabled(): void {
  if (process.env.SHOPIFY_PRIVILEGED_PROXY_ENABLED !== "1") {
    throw new HttpError(404, "Not found");
  }
}

function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    throw new HttpError(403, "Missing request origin");
  }

  let requestOrigin: string;
  let suppliedOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
    suppliedOrigin = new URL(origin).origin;
  } catch {
    throw new HttpError(403, "Invalid request origin");
  }

  if (suppliedOrigin !== requestOrigin) {
    throw new HttpError(403, "Request origin is not allowed");
  }
}

function assertJsonRequest(request: Request): void {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number.parseInt(contentLength, 10);
    if (Number.isFinite(parsedLength) && parsedLength > MAX_REQUEST_BYTES) {
      throw new HttpError(413, "Request body is too large");
    }
  }
}

async function cancelReaderBestEffort(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<void> {
  try {
    await reader.cancel();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown stream cancellation error";
    console.warn("[shopify.server] request body cancellation failed:", message);
  }
}

async function readJsonBodyWithLimit(request: Request): Promise<unknown> {
  if (!request.body) {
    throw new HttpError(400, "Missing request body");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }

      bytesRead += chunk.value.byteLength;
      if (bytesRead > MAX_REQUEST_BYTES) {
        await cancelReaderBestEffort(reader);
        throw new HttpError(413, "Request body is too large");
      }

      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}

function extractOperationName(query: string): string {
  const match = query.match(/^\s*(?:query|mutation)\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
  if (!match) {
    throw new HttpError(400, "A named GraphQL operation is required");
  }
  return match[1];
}

function validateCustomerOrdersRequest(body: ShopifyGraphQLRequestBody): CustomerOrdersVariables {
  const operationName = extractOperationName(body.query);
  if (operationName !== ALLOWED_OPERATION_NAME) {
    throw new HttpError(403, "GraphQL operation is not allowed");
  }

  const customerAccessToken = body.variables?.customerAccessToken;
  if (typeof customerAccessToken !== "string" || customerAccessToken.length < 1) {
    throw new HttpError(400, "customerAccessToken is required");
  }

  const first = body.variables?.first;
  if (typeof first !== "number" || !Number.isInteger(first) || first < 1 || first > 100) {
    throw new HttpError(400, "first must be an integer between 1 and 100");
  }

  return { customerAccessToken, first };
}

async function callShopifyPrivateGraphQL(
  variables: CustomerOrdersVariables,
  buyerIp: string | null
): Promise<ShopifyGraphQLResult> {
  const domain = requireStoreDomain();
  const token = requirePrivateToken();
  const endpoint = `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Shopify-Storefront-Private-Token": token,
  };
  if (buyerIp) {
    headers["Shopify-Storefront-Buyer-IP"] = buyerIp;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: GET_CUSTOMER_ORDERS_QUERY,
      variables,
    }),
  });

  if (!response.ok) {
    throw new HttpError(502, `Shopify upstream request failed with status ${response.status}`);
  }

  return (await response.json()) as ShopifyGraphQLResult;
}

/** Handle POST /api/shopify/graphql. */
export async function handleShopifyPrivilegedRequest(request: Request): Promise<Response> {
  try {
    assertProxyEnabled();
    assertSameOrigin(request);
    assertJsonRequest(request);

    const rawBody = await readJsonBodyWithLimit(request);
    const body = parseGraphQLRequestBody(rawBody);
    const variables = validateCustomerOrdersRequest(body);

    const buyerIp = request.headers.get("cf-connecting-ip");
    const result = await callShopifyPrivateGraphQL(variables, buyerIp);
    return json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const internalMessage = error instanceof Error ? error.message : "Unknown Shopify proxy error";
    console.error(`[shopify.server] privileged request failed (${status}):`, internalMessage);

    const publicMessage = status >= 500 ? "Shopify service is temporarily unavailable" : internalMessage;
    return json({ errors: [{ message: publicMessage }] }, status);
  }
}
