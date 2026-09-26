import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/readiness")({
  server: {
    handlers: {
      GET: async () => {
        const { handleReadinessRequest } = await import("@/server/health.server");
        return handleReadinessRequest();
      },
    },
  },
});
