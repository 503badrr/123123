import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/tap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleProviderWebhook } = await import("@/server/payments/webhook-processor.server");
        return handleProviderWebhook(request, "tap");
      },
    },
  },
});
