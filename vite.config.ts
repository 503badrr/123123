// Standalone Vite config (decoupled from @lovable.dev/vite-tanstack-config).
// Replicates the pieces of the former wrapper this app actually relies on:
// Tailwind v4, tsconfig paths, TanStack Start with the custom SSR error
// wrapper entry (src/server.ts), a Cloudflare-targeted nitro build, and
// React dedupe to keep a single React instance in the bundle.
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Route TanStack Start's bundled server entry through src/server.ts
      // (the SSR error wrapper); nitro builds from this.
      server: { entry: "server" },
    }),
    ...(command === "build" ? [nitro({ defaultPreset: "cloudflare-module" })] : []),
    viteReact(),
  ],
  // Allow the ephemeral e2b preview host (and any other dev proxy host) so the
  // sandbox browser can reach the dev server without Vite's 403 host check.
  server: {
    allowedHosts: true,
    host: "0.0.0.0",
    port: 3000,
  },
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
