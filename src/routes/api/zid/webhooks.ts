import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/zid/webhooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleZidWebhook } = await import("@/server/zid/webhook.server");
        return handleZidWebhook(request);
      },
    },
  },
});
