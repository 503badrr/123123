import { createFileRoute } from "@tanstack/react-router";
import { ordersQueue } from "../data/admin";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({ meta: [{ title: "لوحة الموظف | Switch" }] }),
  component: StaffPage,
});

const statusColor: Record<string, string> = {
  "مكتمل": "bg-emerald-400/15 text-emerald-300",
  "بانتظار التسليم": "bg-amber-400/15 text-amber-300",
  "قيد المراجعة": "bg-cyan-400/15 text-cyan-300",
};

function StaffPage() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="جديدة" value="12" />
        <Mini label="قيد التنفيذ" value="7" />
        <Mini label="مكتملة اليوم" value="48" />
        <Mini label="ملغاة" value="2" />
      </div>

      <div className="overflow-hidden rounded-2xl glass">
        <div className="border-b border-white/10 p-4 text-sm font-bold text-white">طوابير الطلبات</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="bg-white/5 text-xs text-cyan-100/70">
              <tr>
                <th className="px-4 py-3 font-medium">رقم</th>
                <th className="px-4 py-3 font-medium">العميل</th>
                <th className="px-4 py-3 font-medium">المنتج</th>
                <th className="px-4 py-3 font-medium">الإجمالي</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {ordersQueue.map((o) => (
                <tr key={o.id} className="border-t border-white/5 text-cyan-50/90">
                  <td className="px-4 py-3 font-mono text-xs">{o.id}</td>
                  <td className="px-4 py-3">{o.customer}</td>
                  <td className="px-4 py-3">{o.item}</td>
                  <td className="px-4 py-3 font-bold neon-text">{o.total}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[o.status] ?? "bg-white/10 text-white"}`}>{o.status}</span></td>
                  <td className="px-4 py-3">
                    <button className="rounded-lg cosmic-gradient px-3 py-1.5 text-xs font-bold text-[oklch(0.13_0.04_270)]">معالجة</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl glass p-4">
      <div className="text-xs text-cyan-100/70">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}
