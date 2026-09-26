import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  ExternalLink,
  Loader2,
  PackageSearch,
  Plug,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { integrations } from "../data/admin";
import {
  getAliExpressRecommendations,
  getAliExpressStatus,
} from "@/lib/aliexpress.functions";
import {
  normalizeAliExpressRecommendations,
  type AliExpressRecommendation,
} from "@/lib/aliexpress-normalize";
import {
  calculateSourcingPrice,
  scoreSourcingCandidate,
} from "@/lib/sourcing-pricing";

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({ meta: [{ title: "الربط والتوريد | Switch" }] }),
  component: IntegrationsPage,
});

type PricingForm = {
  supplierCostUsd: string;
  shippingUsd: string;
  targetMarginPct: string;
  paymentFeePct: string;
  marketingReservePct: string;
  deliveryDays: string;
  ratingPercent: string;
  orderVolume: string;
};

const initialPricing: PricingForm = {
  supplierCostUsd: "10",
  shippingUsd: "2",
  targetMarginPct: "35",
  paymentFeePct: "3",
  marketingReservePct: "5",
  deliveryDays: "12",
  ratingPercent: "95",
  orderVolume: "500",
};

function IntegrationsPage() {
  const statusQuery = useQuery({
    queryKey: ["admin", "aliexpress-status"],
    queryFn: () => getAliExpressStatus(),
  });
  const [products, setProducts] = useState<AliExpressRecommendation[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [pricingForm, setPricingForm] = useState<PricingForm>(initialPricing);

  const connected = Boolean(
    statusQuery.data?.appKeyConfigured &&
      statusQuery.data?.appSecretConfigured &&
      statusQuery.data?.sessionConfigured,
  );

  const pricing = useMemo(() => {
    try {
      return calculateSourcingPrice({
        supplierCostUsd: Number(pricingForm.supplierCostUsd),
        shippingUsd: Number(pricingForm.shippingUsd),
        targetMarginPct: Number(pricingForm.targetMarginPct),
        paymentFeePct: Number(pricingForm.paymentFeePct),
        marketingReservePct: Number(pricingForm.marketingReservePct),
      });
    } catch {
      return null;
    }
  }, [pricingForm]);

  const candidateScore = useMemo(() => {
    if (!pricing) return null;
    return scoreSourcingCandidate({
      ratingPercent: Number(pricingForm.ratingPercent),
      orderVolume: Number(pricingForm.orderVolume),
      deliveryDays: Number(pricingForm.deliveryDays),
      estimatedMarginPct: pricing.estimatedMarginPct,
      shippingSharePct: pricing.shippingSharePct,
    });
  }, [pricing, pricingForm]);

  async function loadBestSellers() {
    if (!connected) return;
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const payload = await getAliExpressRecommendations({
        data: { pageSize: 12, sort: "volumeDesc" },
      });
      setProducts(normalizeAliExpressRecommendations(payload));
    } catch (error) {
      setProductsError(
        error instanceof Error
          ? error.message
          : "تعذر جلب منتجات AliExpress حاليًا.",
      );
    } finally {
      setLoadingProducts(false);
    }
  }

  function applyCandidate(product: AliExpressRecommendation) {
    setPricingForm((current) => ({
      ...current,
      supplierCostUsd: String(product.priceUsd),
      ratingPercent:
        product.ratingPercent === null
          ? current.ratingPercent
          : String(product.ratingPercent),
      orderVolume:
        product.orderVolume === null
          ? current.orderVolume
          : String(product.orderVolume),
    }));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl glass-strong p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <PackageSearch className="h-4 w-4 text-cyan-300" />
              AliExpress — التوريد للسعودية
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-cyan-100/65">
              اكتشاف منتجات Dropshipper، تقييمها ماليًا، ثم اعتماد المناسب للمتجر. لا يتم تنفيذ أي شراء تلقائي من هذه الشاشة.
            </p>
          </div>
          <ConnectionBadge loading={statusQuery.isLoading} connected={connected} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <SecretState label="App Key" ready={Boolean(statusQuery.data?.appKeyConfigured)} />
          <SecretState label="App Secret" ready={Boolean(statusQuery.data?.appSecretConfigured)} />
          <SecretState label="Session" ready={Boolean(statusQuery.data?.sessionConfigured)} />
        </div>

        {!statusQuery.isLoading && !connected ? (
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs leading-6 text-amber-100">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <div className="font-black">الربط البرمجي جاهز، لكن الحساب الحي غير مفعل.</div>
                <p className="mt-1 text-amber-100/75">
                  أضف <code>ALIEXPRESS_APP_KEY</code> و <code>ALIEXPRESS_APP_SECRET</code> و <code>ALIEXPRESS_SESSION</code> كـ Cloudflare Secrets فقط. لا تضعها في VITE أو GitHub.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl glass p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">أفضل منتجات DS bestseller</div>
              <p className="mt-1 text-xs text-cyan-100/55">السوق: السعودية · اللغة: العربية · عملة المورد: USD</p>
            </div>
            <button
              type="button"
              onClick={loadBestSellers}
              disabled={!connected || loadingProducts}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-200/15 bg-cyan-200/[0.08] px-3 text-xs font-black text-cyan-100 outline-none transition hover:bg-cyan-200/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loadingProducts ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              تحديث
            </button>
          </div>

          {productsError ? (
            <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-6 text-rose-100">
              {productsError}
            </p>
          ) : null}

          {products.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-cyan-100/15 p-8 text-center text-xs leading-6 text-cyan-100/55">
              {connected
                ? "اضغط تحديث لجلب المرشحين من AliExpress."
                : "ستظهر المنتجات هنا فور إضافة أسرار حساب AliExpress المصرح به."}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <article key={product.productId} className="rounded-xl border border-cyan-100/10 bg-white/[0.025] p-3">
                  <div className="flex gap-3">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-16 w-16 place-items-center rounded-lg bg-white/[0.04] text-cyan-100/35">
                        <PackageSearch className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-xs font-bold leading-5 text-white">{product.title}</h2>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-cyan-100/60">
                        <span>${product.priceUsd.toFixed(2)}</span>
                        {product.ratingPercent !== null ? <span>· {product.ratingPercent}% تقييم</span> : null}
                        {product.orderVolume !== null ? <span>· {product.orderVolume} طلب</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyCandidate(product)}
                      className="flex-1 rounded-lg bg-cyan-200/[0.12] px-2 py-2 text-[11px] font-black text-cyan-100 hover:bg-cyan-200/[0.18]"
                    >
                      احسب الربحية
                    </button>
                    <a
                      href={`https://www.aliexpress.com/item/${product.productId}.html`}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-cyan-100/65 hover:text-white"
                      aria-label="فتح المنتج في AliExpress"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl glass p-5">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Calculator className="h-4 w-4 text-violet-300" />
            حاسبة اعتماد المنتج
          </div>
          <p className="mt-1 text-xs leading-6 text-cyan-100/55">
            السعر المقترح يحمي الهامش بعد تكلفة المورد والشحن ورسوم الدفع واحتياطي التسويق. التسوية الضريبية والمصاريف الثابتة تُراجع محاسبيًا بشكل منفصل.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberField label="سعر المورد USD" value={pricingForm.supplierCostUsd} onChange={(value) => updatePricing(setPricingForm, "supplierCostUsd", value)} />
            <NumberField label="الشحن USD" value={pricingForm.shippingUsd} onChange={(value) => updatePricing(setPricingForm, "shippingUsd", value)} />
            <NumberField label="هامش الهدف %" value={pricingForm.targetMarginPct} onChange={(value) => updatePricing(setPricingForm, "targetMarginPct", value)} />
            <NumberField label="رسوم الدفع %" value={pricingForm.paymentFeePct} onChange={(value) => updatePricing(setPricingForm, "paymentFeePct", value)} />
            <NumberField label="احتياطي التسويق %" value={pricingForm.marketingReservePct} onChange={(value) => updatePricing(setPricingForm, "marketingReservePct", value)} />
            <NumberField label="مدة التوصيل يوم" value={pricingForm.deliveryDays} onChange={(value) => updatePricing(setPricingForm, "deliveryDays", value)} />
            <NumberField label="تقييم المورد %" value={pricingForm.ratingPercent} onChange={(value) => updatePricing(setPricingForm, "ratingPercent", value)} />
            <NumberField label="عدد الطلبات" value={pricingForm.orderVolume} onChange={(value) => updatePricing(setPricingForm, "orderVolume", value)} />
          </div>

          {pricing && candidateScore ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="التكلفة الواصلة" value={`${pricing.landedCostSar.toFixed(2)} ر.س`} />
              <Metric label="السعر المقترح" value={`${pricing.recommendedPriceSar} ر.س`} strong />
              <Metric label="الربح التقديري" value={`${pricing.estimatedProfitSar.toFixed(2)} ر.س`} />
              <Metric label="الهامش التقديري" value={`${pricing.estimatedMarginPct}%`} />
              <Metric label="نسبة الشحن من التكلفة" value={`${pricing.shippingSharePct}%`} />
              <Metric label="درجة المنتج" value={`${candidateScore.score}/100`} tone={candidateScore.verdict} />
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-rose-300/15 bg-rose-400/[0.06] p-3 text-xs text-rose-100">
              راجع المدخلات؛ لا يمكن حساب السعر بهذه النسب.
            </div>
          )}

          <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-[11px] leading-5 text-emerald-100/80">
            <ShieldCheck className="mb-1 h-4 w-4 text-emerald-300" />
            قاعدة Switch: المنتج الممتاز يبدأ من 80/100، و60–79 يدخل اختبارًا محدودًا، وأقل من 60 يُستبعد حتى تتحسن تكلفته أو شحنه أو تقييمه.
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
          <Plug className="h-4 w-4 text-cyan-300" />
          بقية التكاملات
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((it) => (
            <div key={it.name} className="rounded-2xl glass p-5 transition hover:neon-glow">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl cosmic-gradient text-[oklch(0.13_0.04_270)]">
                  <Plug className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{it.name}</div>
                  <div className="text-xs text-cyan-100/70">{it.desc}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">{it.status}</span>
                <button disabled className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-cyan-100/50">تفعيل</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ConnectionBadge({ loading, connected }: { loading: boolean; connected: boolean }) {
  if (loading) {
    return <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-cyan-100/60">فحص...</span>;
  }
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
      {connected ? "متصل" : "بانتظار الأسرار"}
    </span>
  );
}

function SecretState({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2 text-xs">
      <span className="text-cyan-100/65">{label}</span>
      <span className={ready ? "font-black text-emerald-300" : "text-amber-300"}>{ready ? "جاهز" : "غير مضاف"}</span>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-cyan-100/65">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-cyan-100/10 bg-white/[0.035] px-3 text-sm text-white outline-none focus:border-cyan-300/30 focus:ring-2 focus:ring-cyan-300/15"
      />
    </label>
  );
}

function Metric({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "excellent" | "test" | "reject";
}) {
  const toneClass =
    tone === "excellent"
      ? "text-emerald-300"
      : tone === "test"
        ? "text-amber-300"
        : tone === "reject"
          ? "text-rose-300"
          : strong
            ? "text-cyan-200"
            : "text-white";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
      <div className="text-[10px] text-cyan-100/55">{label}</div>
      <div className={`mt-1 text-lg font-black ${toneClass}`}>{value}</div>
    </div>
  );
}

function updatePricing(
  setter: React.Dispatch<React.SetStateAction<PricingForm>>,
  key: keyof PricingForm,
  value: string,
) {
  setter((current) => ({ ...current, [key]: value }));
}
