import { productionConfig } from "@/config/production";

interface ReadinessConfig {
  siteUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
}

interface ReadinessResult {
  ready: boolean;
  checks: {
    site: "ok" | "invalid";
    supabase: "configured" | "invalid";
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function evaluateReadiness(config: ReadinessConfig): ReadinessResult {
  const siteReady = isHttpsUrl(config.siteUrl);
  const supabaseReady =
    isSupabaseUrl(config.supabaseUrl) &&
    config.supabasePublishableKey.startsWith("sb_publishable_");

  return {
    ready: siteReady && supabaseReady,
    checks: {
      site: siteReady ? "ok" : "invalid",
      supabase: supabaseReady ? "configured" : "invalid",
    },
  };
}

export function handleHealthRequest(): Response {
  return json({
    status: "ok",
    service: "switch",
    timestamp: new Date().toISOString(),
  });
}

export function handleReadinessRequest(): Response {
  const result = evaluateReadiness({
    siteUrl: productionConfig.siteUrl,
    supabaseUrl: productionConfig.supabaseUrl,
    supabasePublishableKey: productionConfig.supabasePublishableKey,
  });

  return json(
    {
      status: result.ready ? "ready" : "not_ready",
      service: "switch",
      checks: result.checks,
      timestamp: new Date().toISOString(),
    },
    result.ready ? 200 : 503
  );
}
