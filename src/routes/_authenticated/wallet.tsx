import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Award } from "lucide-react";
import { getMyProfile, getMyWalletTransactions } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "المحفظة | Switch" }] }),
  component: WalletPage,
});

function WalletPage() {
  const profile = useQuery({ queryKey: ["me", "wallet"], queryFn: () => getMyProfile() });
  const tx = useQuery({ queryKey: ["me", "wallet_tx"], queryFn: () => getMyWalletTransactions() });
  const w = profile.data?.wallet ?? { balance: 0, loyalty_points: 0 };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-200 text-[oklch(0.2_0.05_265)]"><WalletIcon className="h-5 w-5" /></div>
        <div><div className="text-xs font-bold text-amber-200">المحفظة</div><h1 className="text-2xl font-black text-white">رصيدي ونقاطي</h1></div>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-amber-200/20 bg-gradient-to-br from-[oklch(0.22_0.06_260)]/90 to-[oklch(0.14_0.04_265)]/90 p-6">
          <div className="text-xs font-bold text-amber-200">الرصيد المتاح</div>
          <div className="mt-2 text-4xl font-black text-white">{w.balance} <span className="text-base text-amber-200">ر.س</span></div>
          <Link to="/catalog" className="mt-4 inline-flex rounded-xl bg-gradient-to-l from-amber-300 to-amber-200 px-4 py-2 text-xs font-black text-[oklch(0.2_0.05_265)]">تسوّق الآن</Link>
        </div>
        <div className="rounded-3xl glass-strong p-6">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300"><Award className="h-4 w-4" /> نقاط الولاء</div>
          <div className="mt-2 text-4xl font-black text-white">{w.loyalty_points}</div>
          <p className="mt-3 text-xs text-cyan-100/70">احصل على نقاط مع كل عملية شراء واستبدلها بخصومات.</p>
        </div>
      </div>

      <section className="mt-7 rounded-3xl glass p-5">
        <h2 className="mb-3 text-sm font-black text-white">سجل الحركات</h2>
        {(tx.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-cyan-100/60">لا توجد حركات بعد.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {tx.data!.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
                {Number(t.amount) >= 0 ? <ArrowDownCircle className="h-4 w-4 text-emerald-300" /> : <ArrowUpCircle className="h-4 w-4 text-rose-300" />}
                <div className="min-w-0 flex-1">
                  <div className="text-white">{t.note ?? t.kind}</div>
                  <div className="text-[11px] text-cyan-100/60">{new Date(t.created_at).toLocaleString("ar-SA")}</div>
                </div>
                <div className="shrink-0 font-bold text-white">{t.amount} ر.س</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
