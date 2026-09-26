const MAX_ZID_WEBHOOK_BYTES = 256 * 1024;

const SUPPORTED_ZID_ORDER_EVENTS = new Set([
  "order.create",
  "order.status.update",
  "order.payment_status.update",
]);

interface ZidWebhookEnv {
  ZID_WEBHOOK_USERNAME?: string;
  ZID_WEBHOOK_PASSWORD?: string;
}

export interface ZidWebhookRecord {
  event: string;
  eventId: string;
  payload: Record<string, unknown>;
}

export type RecordZidWebhookEvent = (event: ZidWebhookRecord) => Promise<boolean>;

function json(body: unknown, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timingSafeEqualText(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return diff === 0;
}

function decodeBasicAuthorization(header: string | null): string | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    return atob(header.slice(6).trim());
  } catch {
    return null;
  }
}

function requireWebhookCredentials(env: ZidWebhookEnv): { username: string; password: string } {
  const username = env.ZID_WEBHOOK_USERNAME?.trim();
  const password = env.ZID_WEBHOOK_PASSWORD?.trim();
  if (!username || !password) {
    throw new Error("Zid webhook credentials are not configured");
  }
  return { username, password };
}

function verifyBasicAuthentication(request: Request, env: ZidWebhookEnv): boolean {
  const { username, password } = requireWebhookCredentials(env);
  const supplied = decodeBasicAuthorization(request.headers.get("authorization"));
  return supplied !== null && timingSafeEqualText(supplied, `${username}:${password}`);
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw Object.assign(new Error("Content-Type must be application/json"), { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_ZID_WEBHOOK_BYTES) {
    throw Object.assign(new Error("Webhook body is too large"), { status: 413 });
  }

  if (!request.body) {
    throw Object.assign(new Error("Missing webhook body"), { status: 400 });
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      if (bytesRead > MAX_ZID_WEBHOOK_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw Object.assign(new Error("Webhook body is too large"), { status: 413 });
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }

  if (!isRecord(parsed)) {
    throw Object.assign(new Error("Webhook payload must be an object"), { status: 400 });
  }
  return parsed;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [key, canonicalize(value[key])])
  );
}

function resolveOrderId(payload: Record<string, unknown>): string {
  const direct = payload.id ?? payload.order_id;
  if (typeof direct === "string" || typeof direct === "number") return String(direct);

  const nestedOrder = payload.order;
  if (isRecord(nestedOrder)) {
    const nested = nestedOrder.id ?? nestedOrder.order_id;
    if (typeof nested === "string" || typeof nested === "number") return String(nested);
  }

  return "unknown";
}

export async function buildZidEventId(
  event: string,
  payload: Record<string, unknown>
): Promise<string> {
  const canonical = JSON.stringify(canonicalize(payload));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);

  return `${event}:${resolveOrderId(payload)}:${hash}`;
}

async function persistZidWebhookEvent(event: ZidWebhookRecord): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { error } = await db.from("webhook_events").insert({
    provider: "zid",
    event_id: event.eventId,
    payload: { event: event.event, data: event.payload },
    processed: true,
  });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(`Unable to persist Zid webhook: ${error.message}`);
}

export async function handleZidWebhook(
  request: Request,
  env: ZidWebhookEnv = process.env,
  recordEvent: RecordZidWebhookEvent = persistZidWebhookEvent
): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (url.protocol !== "https:") {
      return json({ error: "HTTPS is required" }, 400);
    }

    if (!verifyBasicAuthentication(request, env)) {
      return json(
        { error: "Unauthorized" },
        401,
        { "www-authenticate": 'Basic realm="Switch Zid webhook"' }
      );
    }

    const event = url.searchParams.get("event")?.trim() ?? "";
    if (!SUPPORTED_ZID_ORDER_EVENTS.has(event)) {
      return json({ error: "Unsupported Zid webhook event" }, 400);
    }

    const payload = await readJsonBody(request);
    const eventId = await buildZidEventId(event, payload);
    const inserted = await recordEvent({ event, eventId, payload });

    return json({ ok: true, duplicate: !inserted, eventId }, 202);
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status: unknown }).status)
        : 500;
    const safeStatus = Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
    const message = error instanceof Error ? error.message : "Zid webhook processing failed";
    console.error(`[zid.webhook] failed (${safeStatus}):`, message);
    return json({ error: safeStatus >= 500 ? "Zid webhook service unavailable" : message }, safeStatus);
  }
}
