import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type WalletTransaction = {
  id: string;
  amount: number;
  kind: string;
  note: string | null;
  created_at: string;
};

type AccountNotification = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = context.supabase as any;
    const { data: profile } = await client
      .from("profiles")
      .select("id, full_name, email, phone, role, is_active")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: wallet } = await client
      .from("wallets")
      .select("balance, loyalty_points")
      .eq("user_id", context.userId)
      .maybeSingle();

    const safeProfile = profile ?? {
      id: context.userId,
      full_name: null,
      email: null,
      phone: null,
      role: "customer",
      is_active: true,
    };

    return {
      profile: safeProfile,
      roles: [safeProfile.role ?? "customer"],
      wallet: {
        balance: Number(wallet?.balance ?? 0),
        loyalty_points: Number(wallet?.loyalty_points ?? 0),
      },
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(80).optional(),
        phone: z.string().trim().min(8).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const client = context.supabase as any;
    const { error } = await client
      .from("profiles")
      .upsert({ id: context.userId, ...data }, { onConflict: "id" });
    if (error) {
      console.error("[server] DB error:", error.message);
      throw new Error("تعذر تحديث الملف الشخصي. حاول مرة أخرى.");
    }
    return { ok: true };
  });

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountNotification[]> => {
    const client = context.supabase as any;
    const { data, error } = await client
      .from("notifications")
      .select("id, title, body, link, read_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[server] DB error:", error.message);
      return [];
    }
    return data ?? [];
  });

export const getMyWalletTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletTransaction[]> => {
    const client = context.supabase as any;
    const { data, error } = await client
      .from("wallet_transactions")
      .select("id, amount, kind, note, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[server] DB error:", error.message);
      return [];
    }
    return data ?? [];
  });
