// Transactional email via Resend (single fetch call — Workers compatible).
// Missing configuration degrades gracefully: we log and skip instead of
// failing the caller, because email must never break payment fulfilment.

export interface OrderEmailCode {
  product_name: string;
  code: string;
}

export interface OrderDeliveryEmailInput {
  to: string;
  customerName: string | null;
  orderNumber: string;
  orderStatus: string;
  total: number;
  currency: string;
  codes: OrderEmailCode[];
  missingCodes: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(input: OrderDeliveryEmailInput): string {
  const name = escapeHtml(input.customerName?.trim() || "عميلنا العزيز");
  const codesRows = input.codes
    .map(
      (c) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #1e2b4a;color:#c7e6ff;font-size:14px;">${escapeHtml(c.product_name)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #1e2b4a;color:#ffffff;font-size:15px;font-weight:bold;direction:ltr;text-align:left;font-family:monospace;">${escapeHtml(c.code)}</td>
        </tr>`,
    )
    .join("");

  const pendingNote =
    input.missingCodes > 0
      ? `<p style="color:#ffd27a;font-size:13px;line-height:1.9;">بعض المنتجات (${input.missingCodes}) قيد التجهيز وسيتم تسليمها إلى حسابك وبريدك خلال وقت قصير.</p>`
      : "";

  return `<!doctype html>
<html dir="rtl" lang="ar">
  <body style="margin:0;background:#071229;padding:24px;font-family:Tahoma,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#0b1a38;border:1px solid #1e2b4a;border-radius:16px;padding:28px;">
      <h1 style="margin:0 0 6px;color:#7fd4ff;font-size:20px;">Switch | سويتش</h1>
      <h2 style="margin:0 0 18px;color:#ffffff;font-size:17px;">تأكيد طلبك ${escapeHtml(input.orderNumber)}</h2>
      <p style="color:#c7e6ff;font-size:14px;line-height:1.9;">مرحباً ${name}،<br/>تم تأكيد الدفع بنجاح بقيمة <strong style="color:#ffffff;">${input.total.toFixed(2)} ${escapeHtml(input.currency)}</strong>.</p>
      ${
        input.codes.length > 0
          ? `<p style="color:#c7e6ff;font-size:14px;">منتجاتك الرقمية:</p>
      <table style="width:100%;border-collapse:collapse;background:#08122b;border:1px solid #1e2b4a;border-radius:10px;overflow:hidden;">
        <tr>
          <th style="padding:10px 14px;background:#101f42;color:#7fd4ff;font-size:13px;text-align:right;">المنتج</th>
          <th style="padding:10px 14px;background:#101f42;color:#7fd4ff;font-size:13px;text-align:left;">الكود</th>
        </tr>
        ${codesRows}
      </table>`
          : ""
      }
      ${pendingNote}
      <p style="color:#8fb3d9;font-size:12px;line-height:1.8;margin-top:22px;">يمكنك دائماً الاطلاع على طلباتك من صفحة حسابك. إذا واجهت أي مشكلة راسلنا على البريد المذكور أدناه وسنساعدك بأولوية.</p>
      <p style="color:#5f7ba3;font-size:11px;margin-top:16px;">© Switch سويتش — هذه رسالة تلقائية، الرد المباشر عليها لا يصل للدعم.</p>
    </div>
  </body>
</html>`;
}

export async function sendOrderDeliveryEmail(input: OrderDeliveryEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[email] RESEND_API_KEY / EMAIL_FROM not configured — skipping order email for", input.orderNumber);
    return false;
  }

  const subject =
    input.codes.length > 0
      ? `طلبك ${input.orderNumber} — تم تسليم منتجاتك الرقمية`
      : `طلبك ${input.orderNumber} — تم تأكيد الدفع`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
        subject,
        html: buildHtml(input),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] Resend rejected order email:", res.status, detail.slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] Resend request failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
