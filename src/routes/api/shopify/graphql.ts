import { createFileRoute } from "@tanstack/react-router";

/**
 * مسار خادم داخلي للعمليات المميّزة مع Shopify.
 * يعمل ضمن نفس عامل Cloudflare الذي ينشر التطبيق — لا Worker منفصل.
 * ينقل التوكن الخاص PRIVATE_STOREFRONT_API_TOKEN عبر src/server/shopify.server.ts
 * ولا يكشفه أبداً للمتصفح.
 */
export const Route = createFileRoute("/api/shopify/graphql")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleShopifyPrivilegedRequest } = await import("@/server/shopify.server");
        return handleShopifyPrivilegedRequest(request);
      },
    },
  },
});
