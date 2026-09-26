import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flame, Timer, Zap } from "lucide-react";
import { byCategory } from "../data/products";
import { ProductCard } from "../components/ProductCard";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Cyber Sprint | عروض اليوم — Switch" },
      { name: "description", content: "حزم مميزة وخصومات سريعة على ألعابك وبطاقاتك المفضلة. ساعات محدودة فقط." },
      { property: "og:title", content: "Cyber Sprint — عروض Switch" },
      { property: "og:description", content: "وفّر أكثر مع باقات Switch المختارة. عرض ينتهي خلال ساعات." },
    ],
  }),
  component: OffersPage,
});

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { h, m, s };
}

function OffersPage() {
  const items = byCategory("offers");
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const { h, m, s } = useCountdown(end);
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="relative overflow-hidden">
      {/* Cyber Sprint background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute -top-40 right-1/4 h-[420px] w-[420px] rounded-full bg-rose-500/25 blur-[140px] animate-glow-pulse" />
        <div className="absolute top-1/3 -left-32 h-[360px] w-[360px] rounded-full bg-amber-400/20 blur-[140px] animate-float" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-10">
        {/* Hero strip */}
        <header className="relative overflow-hidden rounded-3xl border border-rose-400/30 bg-gradient-to-br from-rose-500/15 via-orange-500/10 to-cyan-500/15 p-6 sm:p-10 animate-fade-up">
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-rose-500/30 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-400/30 blur-3xl" />
          {/* scanline */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/80 to-transparent animate-scan" />

          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full sprint-gradient px-3 py-1 text-xs font-black text-[oklch(0.15_0.03_30)] shadow-[0_0_30px_-6px_oklch(0.68_0.25_25/0.8)]">
                <Flame className="h-3.5 w-3.5" />
                CYBER SPRINT
              </div>
              <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl">
                عروض <span className="bg-gradient-to-l from-rose-300 via-amber-300 to-cyan-300 bg-clip-text text-transparent">سريعة</span>،
                توفير <span className="text-amber-300">حقيقي</span>
              </h1>
              <p className="mt-2 max-w-lg text-sm text-rose-100/80 sm:text-base">
                باقات مختارة تنتهي في منتصف الليل — لا تفوّت الفرصة لرفع رصيدك.
              </p>
            </div>

            {/* Countdown */}
            <div className="rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-rose-200">
                <Timer className="h-3 w-3" /> ينتهي العرض خلال
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {[
                  { v: pad(h), l: "ساعة" },
                  { v: pad(m), l: "دقيقة" },
                  { v: pad(s), l: "ثانية" },
                ].map((c, i) => (
                  <div key={c.l} className="flex items-center gap-1.5 sm:gap-2">
                    <div className="grid h-14 w-14 place-items-center rounded-xl border border-rose-400/30 bg-gradient-to-b from-rose-500/20 to-rose-500/5 font-mono text-2xl font-black text-white shadow-[inset_0_0_20px_-8px_oklch(0.68_0.25_25/0.6)] sm:h-16 sm:w-16 sm:text-3xl">
                      {c.v}
                    </div>
                    {i < 2 && <span className="text-xl font-black text-rose-300">:</span>}
                  </div>
                ))}
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center text-[9px] font-bold text-rose-200/70 sm:text-[10px]">
                <span>ساعة</span><span>دقيقة</span><span>ثانية</span>
              </div>
            </div>
          </div>
        </header>

        {/* Highlights */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { t: "خصم حتى 35%", d: "على الباقات المختارة" },
            { t: "شحن لحظي", d: "تسليم خلال ثوانٍ" },
            { t: "كميات محدودة", d: "حتى نفاد الكمية" },
          ].map((b) => (
            <div key={b.t} className="rounded-xl border border-rose-300/20 bg-rose-500/5 p-3 text-center backdrop-blur-md sm:p-4">
              <div className="text-xs font-black text-amber-200 sm:text-sm">{b.t}</div>
              <div className="mt-0.5 text-[10px] text-rose-100/70 sm:text-xs">{b.d}</div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 rounded-xl sprint-gradient px-6 py-3.5 text-sm font-black text-[oklch(0.15_0.03_30)] shadow-[0_0_40px_-8px_oklch(0.68_0.25_25/0.8)] transition hover:scale-105"
          >
            <Zap className="h-4 w-4" />
            تصفّح كل الكتالوج
          </Link>
        </div>
      </div>
    </div>
  );
}
