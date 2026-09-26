import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BatteryCharging,
  Blocks,
  Bot,
  BriefcaseBusiness,
  Cable,
  Camera,
  CarFront,
  CheckCircle2,
  Headphones,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Tv,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  catalogPilotProducts,
  pilotDepartments,
  productsForDepartment,
  type PilotDepartment,
  type PilotIcon,
  type PilotProduct,
} from "../data/catalog-pilot";

export const Route = createFileRoute("/catalog-pilot")({
  head: () => ({
    meta: [
      { title: "نموذج كتالوج الاختبار | Switch" },
      {
        name: "description",
        content: "نموذج داخلي لاختبار أقسام ومنتجات Switch قبل اعتماد المورد والتسعير.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: CatalogPilotPage,
});

const iconMap: Record<PilotIcon, LucideIcon> = {
  headphones: Headphones,
  charger: BatteryCharging,
  cable: Cable,
  "phone-mount": CarFront,
  "dash-cam": Camera,
  entertainment: Tv,
  productivity: BriefcaseBusiness,
  build: Blocks,
  security: ShieldCheck,
  prompts: TerminalSquare,
  automation: Workflow,
};

const fulfillmentLabels: Record<PilotProduct["fulfillment"], string> = {
  physical: "منتج فعلي",
  digital_code: "تسليم رقمي",
  service: "ملف أو خدمة",
};

function CatalogPilotPage() {
  const [active, setActive] = useState<PilotDepartment | "all">("all");
  const products = useMemo(() => productsForDepartment(active), [active]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-9 sm:py-12" dir="rtl">
      <section className="switch-surface relative overflow-hidden rounded-3xl p-6 sm:p-9">
        <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-black text-amber-200">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            نموذج اختبار — غير متاح للبيع
          </span>
          <h1 className="mt-5 text-3xl font-black text-white sm:text-5xl">
            كتالوج Switch التجاري المقترح
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-cyan-100/70 sm:text-base">
            ثلاثة أقسام واضحة تجمع المنتجات الأعلى طلبًا، مع بوابات اعتماد تمنع عرض السعر أو الشراء قبل توثيق المورد والجودة والتسليم.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="منتج اختباري" value={catalogPilotProducts.length.toString()} />
            <Stat label="أقسام رئيسية" value={pilotDepartments.length.toString()} />
            <Stat label="منتجات قابلة للبيع" value="0" tone="safe" />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-3 lg:grid-cols-3" aria-label="أقسام النموذج">
        {pilotDepartments.map((department) => {
          const count = productsForDepartment(department.key).length;
          return (
            <button
              key={department.key}
              type="button"
              onClick={() => setActive(department.key)}
              className="switch-card switch-card-interactive rounded-2xl p-5 text-right outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white">{department.label}</h2>
                  <p className="mt-2 text-sm leading-7 text-cyan-100/60">{department.description}</p>
                </div>
                <span className="grid h-10 min-w-10 place-items-center rounded-xl border border-cyan-100/10 bg-cyan-200/[0.07] text-sm font-black text-cyan-200">
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </section>

      <div className="switch-surface mt-8 flex flex-wrap gap-2 rounded-2xl p-2" role="group" aria-label="تصفية نموذج الكتالوج">
        <FilterButton active={active === "all"} onClick={() => setActive("all")}>الكل</FilterButton>
        {pilotDepartments.map((department) => (
          <FilterButton key={department.key} active={active === department.key} onClick={() => setActive(department.key)}>
            {department.label}
          </FilterButton>
        ))}
      </div>

      <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {products.map((product) => <PilotProductCard key={product.sku} product={product} />)}
      </section>

      <section className="mt-10 rounded-3xl border border-cyan-100/10 bg-cyan-200/[0.035] p-6">
        <div className="flex items-start gap-3">
          <PackageSearch className="mt-1 h-6 w-6 shrink-0 text-cyan-200" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-black text-white">متى يتحول المنتج إلى منتج فعلي؟</h2>
            <p className="mt-2 text-sm leading-7 text-cyan-100/65">
              بعد اعتماد المورد والتكلفة والضمان أو الترخيص، إضافة صورة أصلية، اختبار رحلة الدفع والتسليم، ثم تحويل حالة المنتج من مسودة مراجعة إلى معتمد ونشط.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function PilotProductCard({ product }: { product: PilotProduct }) {
  const Icon = iconMap[product.icon] ?? Bot;
  return (
    <article className="switch-card flex h-full flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-cyan-100/12 bg-gradient-to-br from-cyan-400/15 to-violet-500/10 text-cyan-200">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.07] px-2.5 py-1 text-[10px] font-black text-amber-200">
          {product.demandLabel}
        </span>
      </div>
      <div className="mt-4 text-[11px] font-bold text-cyan-300">{product.subcategory}</div>
      <h3 className="mt-1 text-base font-black text-white">{product.name}</h3>
      <p className="mt-2 text-sm leading-7 text-cyan-100/62">{product.description}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-cyan-100/70">
        <span className="rounded-lg border border-cyan-100/10 bg-white/[0.035] px-2 py-1">{fulfillmentLabels[product.fulfillment]}</span>
        <span className="rounded-lg border border-cyan-100/10 bg-white/[0.035] px-2 py-1">السعر بعد الاعتماد</span>
      </div>
      <ul className="mt-4 space-y-2 text-xs leading-6 text-cyan-100/60">
        {product.reviewChecks.map((check) => (
          <li key={check} className="flex items-start gap-2">
            <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
            {check}
          </li>
        ))}
      </ul>
      <button type="button" disabled className="mt-5 min-h-11 rounded-xl border border-cyan-100/10 bg-white/[0.035] px-4 text-xs font-black text-cyan-100/45 disabled:cursor-not-allowed">
        بانتظار الاعتماد
      </button>
    </article>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`min-h-11 rounded-xl px-4 text-xs font-black outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${active ? "border border-cyan-100/15 bg-cyan-200/[0.1] text-white" : "text-cyan-50/65 hover:bg-white/[0.05] hover:text-white"}`}>
      {children}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "safe" }) {
  return (
    <div className="rounded-2xl border border-cyan-100/10 bg-black/15 p-4">
      <div className={`text-2xl font-black ${tone === "safe" ? "text-emerald-300" : "text-cyan-200"}`}>{value}</div>
      <div className="mt-1 text-xs font-bold text-cyan-100/55">{label}</div>
    </div>
  );
}
