import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const { handleHealthRequest } = await import("@/server/health.server");
        return handleHealthRequest();
      },
    },
  },
});
