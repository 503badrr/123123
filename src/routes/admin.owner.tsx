import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { kpis, revenueSeries } from "../data/admin";

export const Route = createFileRoute("/admin/owner")({
  head: () => ({ meta: [{ title: "لوحة المالك | Switch" }, { name: "description", content: "نظرة عامة على أداء المتجر." }] }),
  component: OwnerPage,
});

function OwnerPage() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl glass p-4">
            <div className="text-xs text-cyan-100/70">{k.label}</div>
            <div className="mt-2 text-xl font-black text-white sm:text-2xl">{k.value}</div>
            <div className={`mt-1 inline-flex items-center gap-1 text-xs ${k.tone === "up" ? "text-emerald-300" : "text-rose-300"}`}>
              {k.tone === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl glass p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-sm font-bold text-white">إيرادات آخر 7 أيام</div>
            <div className="text-xs text-cyan-100/60">بيانات تجريبية بالريال السعودي</div>
          </div>
          <Link to="/admin/analytics" className="text-xs font-bold text-cyan-300 hover:text-white">عرض التحليلات ←</Link>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueSeries}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.85 0.18 200)" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="oklch(0.65 0.22 255)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="oklch(0.72 0.04 240)" fontSize={11} reversed />
              <YAxis stroke="oklch(0.72 0.04 240)" fontSize={11} orientation="right" />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.05 270)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, color: "white" }} />
              <Area type="monotone" dataKey="value" stroke="oklch(0.85 0.18 200)" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl glass p-5">
          <div className="mb-3 text-sm font-bold text-white">أعلى الفئات مبيعًا</div>
          <ul className="space-y-3">
            {[{ n: "الألعاب", v: 48 }, { n: "البطاقات", v: 27 }, { n: "الاشتراكات", v: 18 }, { n: "العروض", v: 7 }].map((r) => (
              <li key={r.n}>
                <div className="flex items-center justify-between text-xs text-cyan-100/80">
                  <span>{r.n}</span><span>{r.v}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full cosmic-gradient" style={{ width: `${r.v}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl glass p-5">
          <div className="mb-3 text-sm font-bold text-white">أهم الإجراءات</div>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/admin/staff" className="rounded-xl glass-strong p-3 text-center text-xs font-bold text-white">طلبات اليوم</Link>
            <Link to="/admin/finance" className="rounded-xl glass-strong p-3 text-center text-xs font-bold text-white">المالية</Link>
            <Link to="/admin/security" className="rounded-xl glass-strong p-3 text-center text-xs font-bold text-white">الأمان</Link>
            <Link to="/admin/integrations" className="rounded-xl glass-strong p-3 text-center text-xs font-bold text-white">الربط</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
