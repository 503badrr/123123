import { describe, expect, it } from "vitest";
import {
  evaluateReadiness,
  handleHealthRequest,
  handleReadinessRequest,
} from "./health.server";

describe("production health and readiness endpoints", () => {
  it("returns a cache-disabled liveness response without exposing configuration", async () => {
    const response = handleHealthRequest();
    const body = (await response.json()) as {
      status: string;
      service: string;
      timestamp: string;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.status).toBe("ok");
    expect(body.service).toBe("switch");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(JSON.stringify(body)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(JSON.stringify(body)).not.toContain("PRIVATE_STOREFRONT_API_TOKEN");
  });

  it("accepts structurally valid canonical site and public Supabase configuration", () => {
    const result = evaluateReadiness({
      siteUrl: "https://swwiitch.com",
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_example",
    });

    expect(result.ready).toBe(true);
    expect(result.checks).toEqual({
      site: "ok",
      supabase: "configured",
    });
  });

  it("fails readiness when core public configuration is invalid", () => {
    const result = evaluateReadiness({
      siteUrl: "http://swwiitch.com",
      supabaseUrl: "not-a-url",
      supabasePublishableKey: "",
    });

    expect(result.ready).toBe(false);
    expect(result.checks).toEqual({
      site: "invalid",
      supabase: "invalid",
    });
  });

  it("reports the repository production configuration as ready without returning secret values", async () => {
    const response = handleReadinessRequest();
    const body = (await response.json()) as {
      status: string;
      service: string;
      checks: Record<string, string>;
      timestamp: string;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.status).toBe("ready");
    expect(body.service).toBe("switch");
    expect(body.checks).toEqual({ site: "ok", supabase: "configured" });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("sb_publishable_");
    expect(serialized).not.toContain("supabase.co");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("PRIVATE_STOREFRONT_API_TOKEN");
  });
});
