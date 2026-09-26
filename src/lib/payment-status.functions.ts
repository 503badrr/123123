import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PaymentStatusInput = z.object({
  orderNumber: z.string().trim().min(2).max(40),
});

export const getPaymentReturnStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PaymentStatusInput.parse(input))
  .handler(async ({ data }) => {
    const [{ reconcileOrderPayment }, { enforceRateLimit, getClientIpHash }] = await Promise.all([
      import("@/server/payments/reconcile.server"),
      import("@/server/rate-limit.server"),
    ]);

    const ipHash = await getClientIpHash();
    await enforceRateLimit({
      key: ipHash
        ? `payment-return:ip:${ipHash}`
        : `payment-return:order:${data.orderNumber.toLowerCase()}`,
      limit: ipHash ? 20 : 10,
      windowSeconds: 300,
      message: "تعذر تحديث حالة الدفع مؤقتا. حاول بعد قليل.",
    });

    try {
      return await reconcileOrderPayment(data.orderNumber);
    } catch (error) {
      console.warn(
        "[payment return] reconciliation unavailable:",
        error instanceof Error ? error.message : error,
      );
      return {
        orderNumber: data.orderNumber,
        status: "pending" as const,
        providerStatus: null,
        nextAction: "wait" as const,
      };
    }
  });
