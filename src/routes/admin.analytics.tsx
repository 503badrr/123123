import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categorySplit, revenueSeries } from "../data/admin";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "التحليلات | Switch" }] }),
  component: AnalyticsPage,
});

const COLORS = ["oklch(0.85 0.18 200)", "oklch(0.65 0.22 255)", "oklch(0.65 0.25 295)", "oklch(0.72 0.25 340)"];

function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="زيارات اليوم" value="8,420" />
        <Stat label="معدل التحويل" value="3.8%" />
        <Stat label="معدل الارتداد" value="42%" />
        <Stat label="جلسات الجوال" value="71%" />
      </div>

      <div className="rounded-2xl glass p-5">
        <div className="mb-4 text-sm font-bold text-white">إيرادات الأسبوع</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueSeries}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.05)" />
              <XAxis dataKey="day" stroke="oklch(0.72 0.04 240)" fontSize={11} reversed />
              <YAxis stroke="oklch(0.72 0.04 240)" fontSize={11} orientation="right" />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.05 270)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, color: "white" }} />
              <Bar dataKey="value" fill="oklch(0.85 0.18 200)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl glass p-5">
          <div className="mb-4 text-sm font-bold text-white">توزيع المبيعات حسب الفئة</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categorySplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={4}>
                  {categorySplit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.18 0.05 270)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, color: "white" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl glass p-5">
          <div className="mb-3 text-sm font-bold text-white">أعلى المنتجات</div>
          <ol className="space-y-2 text-sm">
            {[
              { n: "اشتراك Netflix شهر", v: "184 طلب" },
              { n: "شدات ببجي 660", v: "162 طلب" },
              { n: "PSN 100", v: "128 طلب" },
              { n: "حزمة اللاعب المحترف", v: "97 طلب" },
              { n: "Spotify بريميوم 3 شهور", v: "84 طلب" },
            ].map((r, i) => (
              <li key={r.n} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span className="text-cyan-50/90"><span className="ml-2 font-mono text-cyan-300">#{i + 1}</span>{r.n}</span>
                <span className="text-xs font-bold text-white">{r.v}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl glass p-4">
      <div className="text-xs text-cyan-100/70">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}
