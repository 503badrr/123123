import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RefundInput = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]),
  confirmation: z.literal("CONFIRM_REFUND"),
});

async function assertFinancialAdmin(context: { supabase: any; userId: string }): Promise<void> {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", context.userId)
    .single();
  if (error) throw new Error("Unable to verify refund authorization.");
  if (!data?.is_active || !["owner", "admin"].includes(data.role)) throw new Error("Forbidden");
}

export const requestPaymentRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RefundInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertFinancialAdmin(context);
    const { createTapRefund } = await import("@/server/payments/refunds.server");
    return createTapRefund({
      paymentId: data.paymentId,
      amount: data.amount,
      reason: data.reason,
      actorId: context.userId,
    });
  });
