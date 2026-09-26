import { createFileRoute } from "@tanstack/react-router";
import { Crown, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { financeRows } from "../data/admin";

export const Route = createFileRoute("/admin/finance")({
  head: () => ({ meta: [{ title: "المالية | Switch" }] }),
  component: FinancePage,
});

function FinancePage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-300" />
        <h1 className="text-xl font-black text-white">المركز المالي</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="الإيرادات (الشهر)" value="284,500 ر.س" tone="up" trend="+12.4%" />
        <Stat icon={TrendingDown} label="المصروفات" value="68,200 ر.س" tone="down" trend="-3.1%" />
        <Stat icon={TrendingUp} label="صافي الربح" value="216,300 ر.س" tone="up" trend="+18.7%" />
        <Stat icon={Wallet} label="رصيد المحفظة" value="412,940 ر.س" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-amber-200/15 bg-gradient-to-b from-[oklch(0.2_0.05_265)]/80 to-[oklch(0.14_0.04_265)]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="text-sm font-black text-white">سجل المعاملات</div>
          <div className="text-[11px] text-amber-200/80">آخر التحركات</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-right text-sm">
            <thead className="bg-white/[0.03] text-xs text-amber-200/80">
              <tr>
                <th className="px-4 py-3 font-bold">التاريخ</th>
                <th className="px-4 py-3 font-bold">النوع</th>
                <th className="px-4 py-3 font-bold">القناة</th>
                <th className="px-4 py-3 font-bold">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {financeRows.map((r, i) => (
                <tr key={i} className="border-t border-white/5 text-cyan-50/90 transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs text-amber-200/90">{r.date}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.type === "إيراد" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>{r.type}</span>
                  </td>
                  <td className="px-4 py-3">{r.channel}</td>
                  <td className={`px-4 py-3 font-bold ${r.amount.startsWith("+") ? "text-emerald-300" : "text-rose-300"}`}>{r.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone, trend }: { icon: any; label: string; value: string; tone?: "up" | "down"; trend?: string }) {
  const color = tone === "up" ? "text-emerald-300" : tone === "down" ? "text-rose-300" : "text-amber-200";
  return (
    <div className="rounded-2xl border border-amber-200/15 bg-gradient-to-br from-white/[0.04] to-transparent p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold text-cyan-100/70">{label}</div>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-2 text-xl font-black text-white sm:text-2xl">{value}</div>
      {trend && <div className={`mt-1 text-[11px] font-bold ${color}`}>{trend}</div>}
    </div>
  );
}
