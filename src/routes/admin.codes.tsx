import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Search, KeySquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importCodesCsv, listDigitalCodes } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/codes")({
  head: () => ({ meta: [{ title: "الأكواد الرقمية | Switch" }] }),
  component: CodesAdminPage,
});

function CodesAdminPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");

  const codes = useQuery({
    queryKey: ["admin", "codes", { search, status }],
    queryFn: () => listDigitalCodes({ data: { search: search || undefined, status: status || undefined } }),
  });

  const importMut = useMutation({
    mutationFn: (csv: string) => importCodesCsv({ data: { csv } }),
    onSuccess: (r) => {
      toast.success(`تم استيراد ${r.inserted} كود (تم تخطّي ${r.skipped})`);
      qc.invalidateQueries({ queryKey: ["admin", "codes"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر الاستيراد"),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    importMut.mutate(text);
    e.target.value = "";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeySquare className="h-4 w-4 text-cyan-300" />
          <h1 className="text-xl font-black text-white">الأكواد الرقمية</h1>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl cosmic-gradient px-3 py-2 text-xs font-black text-[oklch(0.13_0.04_270)]">
          {importMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          رفع CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={importMut.isPending} />
        </label>
      </div>

      <div className="rounded-2xl glass p-4 text-xs text-cyan-100/70">
        <div className="font-bold text-white">صيغة CSV المطلوبة:</div>
        <code className="mt-1 block break-all rounded-lg bg-black/30 p-2 font-mono text-[11px] text-cyan-200">
          product_slug,code,expires_at,status
        </code>
        <p className="mt-1">الحالات المقبولة: available, reserved, delivered, disabled. ويمكن استخدام product_sku كبديل مؤقت لـ product_slug.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cyan-100/50" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالكود"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-9 text-sm text-white placeholder:text-cyan-100/40 focus:border-cyan-300/50 focus:outline-none" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          <option value="">كل الحالات</option>
          <option value="available">متاح</option>
          <option value="reserved">محجوز</option>
          <option value="delivered">مُسلَّم</option>
          <option value="disabled">معطّل</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl glass-strong">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-white/10 px-4 py-3 text-[11px] font-bold text-cyan-100/60">
          <div>المنتج / الكود</div><div>المرجع</div><div>الحالة</div><div>التاريخ</div>
        </div>
        {codes.isLoading ? (
          <div className="p-6 text-center text-sm text-cyan-100/60">جارٍ التحميل...</div>
        ) : (codes.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-cyan-100/60">لا توجد أكواد بعد. ارفع ملف CSV لبدء الإدارة.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {codes.data!.map((c: any) => (
              <li key={c.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-bold text-white">{c.products?.name_ar ?? c.product_id}</div>
                  <div className="truncate font-mono text-[11px] text-cyan-100/60">{c.code}</div>
                </div>
                <div className="text-xs text-cyan-100/70">{c.products?.slug ?? "—"}</div>
                <div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    c.status === "available" ? "bg-emerald-400/15 text-emerald-300" :
                    c.status === "delivered" ? "bg-cyan-400/15 text-cyan-300" :
                    c.status === "reserved" ? "bg-amber-400/15 text-amber-300" :
                    "bg-white/10 text-white/70"
                  }`}>{c.status}</span>
                </div>
                <div className="text-[10px] text-cyan-100/50">{new Date(c.created_at).toLocaleDateString("ar-SA")}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
