import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Award, ShoppingBag, Bell, LogOut, User, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "حسابي | Switch" }] }),
  component: AccountPage,
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: "owner" | "admin" | "staff" | "customer" | string;
  is_active: boolean;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
};

async function getCurrentProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("غير مصرح");

  const client = supabase as any;
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, email, phone, role, is_active")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) throw error;

  return (
    data ?? {
      id: userData.user.id,
      full_name: userData.user.user_metadata?.full_name ?? userData.user.user_metadata?.name ?? null,
      email: userData.user.email ?? null,
      phone: null,
      role: "customer",
      is_active: true,
    }
  ) as ProfileRow;
}

async function getCurrentOrders() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("غير مصرح");

  const client = supabase as any;
  const { data, error } = await client
    .from("orders")
    .select("id, order_number, status, total, currency, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as OrderRow[];
}

function AccountPage() {
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["me", "profile"], queryFn: getCurrentProfile });
  const orders = useQuery({ queryKey: ["me", "orders"], queryFn: getCurrentOrders });

  async function logout() {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/auth" });
  }

  const wallet = { balance: 0, loyalty_points: 0 };
  const fullName = profile.data?.full_name ?? profile.data?.email ?? "مرحبًا بك";
  const isStaff = ["owner", "admin", "staff"].includes(profile.data?.role ?? "");

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 h-[360px] w-[360px] rounded-full bg-amber-300/10 blur-[140px]" />
      </div>
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <header className="flex items-start justify-between gap-3 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-200 text-[oklch(0.2_0.05_265)]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200">حسابي</div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{profile.isLoading ? "جاري التحميل..." : fullName}</h1>
              {profile.data?.email && <p className="mt-1 text-xs text-cyan-100/60">{profile.data.email}</p>}
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-cyan-100/85 hover:bg-white/5">
            <LogOut className="h-3.5 w-3.5" /> خروج
          </button>
        </header>

        {profile.error && (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            تعذر تحميل بيانات الحساب. سجّل خروج ثم ادخل مرة أخرى.
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <Tile icon={Wallet} label="رصيد المحفظة" value={`${wallet.balance} ر.س`} />
          <Tile icon={Award} label="نقاط الولاء" value={String(wallet.loyalty_points)} />
          <Tile icon={ShoppingBag} label="إجمالي الطلبات" value={String(orders.data?.length ?? 0)} />
        </div>

        {isStaff && (
          <div className="mt-5 rounded-2xl border border-amber-200/30 bg-amber-200/5 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-200">
              <Crown className="h-4 w-4" /> لديك صلاحيات إدارية
            </div>
            <p className="mt-1 text-xs text-amber-100/80">يمكنك الوصول إلى لوحات الإدارة من القائمة الجانبية.</p>
            <Link to="/admin/owner" className="mt-3 inline-flex rounded-xl bg-gradient-to-l from-amber-300 to-amber-200 px-4 py-2 text-xs font-black text-[oklch(0.2_0.05_265)]">
              فتح لوحة الإدارة
            </Link>
          </div>
        )}

        <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl glass-strong p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-white">آخر الطلبات</h2>
              <span className="text-xs text-cyan-100/60">{orders.data?.length ?? 0} طلب</span>
            </div>
            {orders.isLoading ? (
              <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5" />)}</div>
            ) : orders.error ? (
              <p className="py-10 text-center text-sm text-rose-200">تعذر تحميل الطلبات حاليًا.</p>
            ) : (orders.data ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-cyan-100/60">لا توجد طلبات بعد. <Link to="/catalog" className="text-cyan-300 hover:underline">تصفّح الكتالوج</Link></p>
            ) : (
              <ul className="divide-y divide-white/5">
                {orders.data!.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{o.order_number}</div>
                      <div className="text-[11px] text-cyan-100/60">{new Date(o.created_at).toLocaleDateString("ar-SA")}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-black text-white">{o.total} ر.س</div>
                      <StatusBadge status={o.status as string} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="rounded-3xl glass p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Bell className="h-4 w-4" /> الإشعارات</div>
            <p className="py-6 text-center text-xs text-cyan-100/60">لا توجد إشعارات</p>
          </aside>
        </section>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-200/15 bg-gradient-to-br from-[oklch(0.22_0.06_260)]/80 to-[oklch(0.16_0.05_270)]/80 p-5 backdrop-blur-xl">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300/15 text-amber-300"><Icon className="h-4 w-4" /></div>
      <div className="mt-3 text-[11px] font-bold text-cyan-100/70">{label}</div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "قيد المعالجة", cls: "bg-amber-400/15 text-amber-300" },
    paid: { label: "مدفوع", cls: "bg-cyan-400/15 text-cyan-300" },
    processing: { label: "قيد التنفيذ", cls: "bg-blue-400/15 text-blue-300" },
    fulfilled: { label: "مكتمل", cls: "bg-emerald-400/15 text-emerald-300" },
    failed: { label: "فشل", cls: "bg-rose-400/15 text-rose-300" },
    cancelled: { label: "ملغى", cls: "bg-white/10 text-white/70" },
    refunded: { label: "مُسترد", cls: "bg-white/10 text-white/70" },
  };
  const s = map[status] ?? { label: status, cls: "bg-white/10 text-white/70" };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.label}</span>;
}
