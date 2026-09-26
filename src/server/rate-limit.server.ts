// Shared, fail-closed rate limiting backed by the rate_limits table
// (consume_rate_limit RPC). Uses Web Crypto only — Workers compatible.
import { getRequest } from "@tanstack/react-start/server";

export async function getClientIpHash(): Promise<string | null> {
  const req = getRequest();
  if (!req) return null;
  const raw =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    null;
  if (!raw) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface RateLimitOptions {
  /** Namespaced bucket key, e.g. `checkout:<ipHash>`. */
  key: string;
  /** Max allowed events per window. */
  limit: number;
  windowSeconds: number;
  /** User-facing Arabic message thrown when the limit is exceeded. */
  message?: string;
}

/**
 * Throws when the caller exceeded the limit — and also when the limiter
 * itself cannot be evaluated (fail closed), so an outage never silently
 * disables abuse protection.
 */
export async function enforceRateLimit(options: RateLimitOptions): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: allowed, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    p_key: options.key,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] evaluation failed:", error.message);
    throw new Error("تعذر معالجة الطلب حالياً. حاول مرة أخرى بعد قليل.");
  }
  if (!allowed) {
    throw new Error(options.message ?? "عدد المحاولات تجاوز الحد المسموح. حاول لاحقاً.");
  }
}
