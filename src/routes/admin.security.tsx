import { createFileRoute } from "@tanstack/react-router";
import { Crown, Lock, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { securityLog } from "../data/admin";

export const Route = createFileRoute("/admin/security")({
  head: () => ({ meta: [{ title: "الأمان | Switch" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-300" />
        <h1 className="text-xl font-black text-white">مركز الأمان</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile icon={ShieldCheck} label="التحقق بخطوتين" value="مفعّل" tone="ok" />
        <Tile icon={ShieldAlert} label="محاولات مشبوهة (24س)" value="3" tone="warn" />
        <Tile icon={Lock} label="جلسات نشطة" value="9" tone="info" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-amber-200/15 bg-gradient-to-b from-[oklch(0.2_0.05_265)]/80 to-[oklch(0.14_0.04_265)]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="text-sm font-black text-white">سجل الأحداث</div>
          <div className="text-[11px] text-amber-200/80">مراقبة لحظية</div>
        </div>
        <ul className="divide-y divide-white/5">
          {securityLog.map((e, i) => (
            <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-sm transition hover:bg-white/[0.02]">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                e.level === "info" ? "bg-emerald-400/10 text-emerald-300" :
                e.level === "warn" ? "bg-amber-400/15 text-amber-300" :
                "bg-rose-400/15 text-rose-300"
              }`}>
                {e.level === "info" ? <ShieldCheck className="h-4 w-4" /> : e.level === "warn" ? <ShieldQuestion className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <div className="truncate font-medium text-cyan-50/95">{e.event}</div>
                <div className="text-xs text-cyan-100/55">IP: {e.ip}</div>
              </div>
              <div className="shrink-0 text-xs font-mono text-amber-200/80">{e.time}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "ok" | "warn" | "info" }) {
  const ring = tone === "ok" ? "text-emerald-300 bg-emerald-400/10" : tone === "warn" ? "text-amber-300 bg-amber-400/10" : "text-cyan-300 bg-cyan-400/10";
  return (
    <div className="rounded-2xl border border-amber-200/15 bg-gradient-to-br from-white/[0.04] to-transparent p-5 backdrop-blur-xl">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${ring}`}><Icon className="h-5 w-5" /></div>
      <div className="mt-3 text-[11px] font-bold text-cyan-100/70">{label}</div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}
