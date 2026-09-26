import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const CONTACT_RATE_LIMIT_PER_IP = 5;
const CONTACT_RATE_LIMIT_PER_EMAIL = 3;
const CONTACT_RATE_WINDOW_MINUTES = 60;

// Web Crypto (not node:crypto) — the app deploys to Cloudflare Workers.
async function clientIpHash(): Promise<string | null> {
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

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(2, "الاسم قصير جداً").max(80, "الاسم أطول من اللازم"),
        email: z
          .string()
          .trim()
          .email("بريد إلكتروني غير صالح")
          .max(120, "البريد الإلكتروني أطول من اللازم"),
        subject: z.string().trim().min(3, "الموضوع قصير جداً").max(120, "الموضوع أطول من اللازم"),
        message: z
          .string()
          .trim()
          .min(10, "الرسالة قصيرة جداً")
          .max(4000, "الرسالة أطول من اللازم"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const ipHash = await clientIpHash();

    // Per-IP rate limit; falls back to a stricter per-email limit when no client IP
    // is resolvable, so the limiter is never silently disabled.
    const windowStart = new Date(Date.now() - CONTACT_RATE_WINDOW_MINUTES * 60_000).toISOString();
    const limit = ipHash ? CONTACT_RATE_LIMIT_PER_IP : CONTACT_RATE_LIMIT_PER_EMAIL;
    let countQuery = db
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", windowStart);
    countQuery = ipHash ? countQuery.eq("ip_hash", ipHash) : countQuery.eq("email", data.email);
    const { count, error: rateErr } = await countQuery;
    if (rateErr) {
      // Fail closed: if we cannot evaluate the limit, do not accept the message.
      console.error("[contact] rate-limit check failed:", rateErr.message);
      throw new Error("تعذر إرسال الرسالة حالياً. حاول لاحقاً أو راسلنا على البريد مباشرة.");
    }
    if ((count ?? 0) >= limit) {
      throw new Error("تجاوزت الحد المسموح من الرسائل. حاول لاحقاً أو راسلنا مباشرة على البريد.");
    }

    const { error } = await db.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      status: "new",
      ip_hash: ipHash,
    });
    if (error) {
      console.error("[contact] insert failed:", error.message);
      throw new Error("تعذر إرسال الرسالة. حاول لاحقاً أو راسلنا على البريد مباشرة.");
    }
    return { ok: true };
  });
