import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Bolt,
  CheckCircle2,
  Headset,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Zap,
} from "lucide-react";
import { products } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { ProductArtwork } from "../components/ProductArtwork";
import { CategoryBanners } from "../components/CategoryBanners";
import { SectionHeading } from "../components/SectionHeading";
import { TrustBanner } from "../components/TrustBanner";
import { absoluteUrl, productionConfig } from "../config/production";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Switch | سويتش — كل عالمك الرقمي" },
      {
        name: "description",
        content: "ألعاب وبطاقات رقمية واشتراكات بتجربة سعودية سريعة وآمنة.",
      },
      { property: "og:title", content: "Switch | سويتش — كل عالمك الرقمي" },
      {
        property: "og:description",
        content: `ألعاب وبطاقات رقمية واشتراكات وعروض عبر ${productionConfig.siteHost}.`,
      },
      { property: "og:image", content: absoluteUrl("/og-switch.png") },
    ],
  }),
  component: Home,
});

const popular = products.slice(0, 6);
const offers = products.filter((product) => product.category === "offers");

const steps = [
  {
    n: "1",
    t: "اختر المنتج",
    d: "حدّد اللعبة أو البطاقة أو الاشتراك والقيمة المناسبة.",
  },
  {
    n: "2",
    t: "راجع الطلب",
    d: "تأكد من المنصة والدولة والكمية وبيانات الاستلام.",
  },
  {
    n: "3",
    t: "ادفع بأمان",
    d: "انتقل إلى بوابة الدفع المعتمدة دون تخزين بيانات بطاقتك.",
  },
  {
    n: "4",
    t: "استلم طلبك",
    d: "يبدأ التسليم الرقمي بعد تأكيد عملية الدفع بنجاح.",
  },
];

const features = [
  {
    icon: Bolt,
    t: "تسليم رقمي سريع",
    d: "تجربة واضحة من إنشاء الطلب حتى تأكيد المنتج الرقمي.",
  },
  {
    icon: ShieldCheck,
    t: "دفع آمن",
    d: "جلسة دفع مستضافة ولا نخزّن بيانات البطاقة داخل Switch.",
  },
  {
    icon: Tag,
    t: "عروض مختارة",
    d: "منتجات وباقات منظمة حسب الألعاب والبطاقات والاشتراكات.",
  },
  {
    icon: Headset,
    t: "دعم رسمي",
    d: `متابعة عبر ${productionConfig.supportEmail} مع رقم الطلب.`,
  },
];

function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-cyan-100/[0.06]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <img
            src="/banners/hero-galaxy.png"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-36"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.075_0.028_270/0.58)] via-[oklch(0.075_0.028_270/0.42)] to-[oklch(0.075_0.028_270/0.94)]" />
          <div className="absolute inset-0 grid-bg opacity-28" />
          <div className="absolute -top-32 left-1/2 h-[580px] w-[580px] -translate-x-1/2 rounded-full bg-cyan-500/14 blur-[150px] animate-glow-pulse" />
          <div className="absolute top-1/4 -left-20 h-[320px] w-[320px] rounded-full bg-violet-600/16 blur-[130px] animate-float" />
          <div className="absolute bottom-0 -right-20 h-[360px] w-[360px] rounded-full bg-blue-500/14 blur-[145px] animate-float [animation-delay:1.5s]" />
        </div>

        <div className="relative mx-auto grid min-h-[610px] max-w-7xl items-center gap-10 px-4 py-14 lg:min-h-[700px] lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:py-20">
          <div className="animate-fade-up text-center lg:text-right">
            <div className="switch-surface mb-5 inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[11px] font-black text-cyan-100 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              متجر رقمي سعودي بتجربة عالمية
            </div>
            <h1 className="text-4xl font-black leading-[1.08] text-white sm:text-6xl lg:text-7xl">
              كل عالمك
              <span className="mx-2 inline-block shimmer-text">الرقمي</span>
              <br />
              صار أقرب مع Switch
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-cyan-100/72 sm:text-lg lg:mx-0">
              اشحن ألعابك، اطلب بطاقاتك، وفعّل اشتراكاتك من مكان واحد. تجربة عربية سريعة، أسعار واضحة، ودفع ينتقل مباشرة إلى بوابة آمنة.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
              <Link to="/catalog" className="switch-button-primary group min-h-12 rounded-2xl px-7 py-3.5">
                <Zap className="h-4 w-4" aria-hidden="true" />
                تسوق الآن
                <ArrowLeft
                  className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link to="/offers" className="switch-button-secondary min-h-12 rounded-2xl px-7 py-3.5">
                <Star className="h-4 w-4 text-amber-300" aria-hidden="true" />
                عروض اليوم
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs font-bold text-cyan-50/68 lg:justify-start">
              {["أسعار من الخادم", "وسائل دفع متعددة", "تسليم بعد تأكيد الدفع"].map(
                (label) => (
                  <span key={label} className="inline-flex min-h-8 items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                    {label}
                  </span>
                ),
              )}
            </div>
          </div>

          <HeroProductStack />
        </div>
      </section>

      <CategoryBanners />

      <ProductSection
        title="الأكثر طلبًا"
        subtitle="منتجات رقمية يطلبها اللاعبون والعملاء يوميًا"
        link="/catalog"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {popular.map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </ProductSection>

      <ProductSection
        title="عروض الأسبوع"
        link="/offers"
        subtitle="باقات مختارة بتوفير واضح وتجربة شراء سهلة"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </ProductSection>

      <section className="defer-render mx-auto max-w-7xl px-4 py-12">
        <TrustBanner />
      </section>

      <section className="defer-render mx-auto max-w-7xl px-4 py-14">
        <SectionHeading
          eyebrow="لماذا Switch"
          title="تجربة رقمية مبنية للثقة"
          description="واجهة واضحة، قاعدة بيانات محمية، وتسعير يُحسب من الخادم قبل إنشاء جلسة الدفع."
          align="center"
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.t}
                className="switch-card switch-card-interactive group relative overflow-hidden rounded-2xl p-5"
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/8 blur-2xl transition group-hover:bg-cyan-400/14"
                  aria-hidden="true"
                />
                <div className="relative grid h-12 w-12 place-items-center rounded-xl border border-cyan-100/12 bg-cyan-200/[0.08] text-cyan-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-black text-white">{feature.t}</h3>
                <p className="mt-1 text-sm leading-7 text-cyan-100/65">{feature.d}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="defer-render mx-auto max-w-7xl px-4 py-14">
        <SectionHeading
          title="من الاختيار إلى التسليم"
          description="أربع خطوات واضحة دون ادعاء نجاح الدفع قبل تأكيد البوابة."
          align="center"
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <article
              key={step.n}
              className="switch-card switch-card-interactive relative overflow-hidden rounded-2xl p-5"
            >
              <div
                className="pointer-events-none absolute -left-2 -top-4 text-8xl font-black text-white/[0.035]"
                aria-hidden="true"
              >
                {step.n}
              </div>
              <div className="relative">
                <div className="switch-status border-cyan-300/35 text-cyan-300">
                  خطوة {step.n}
                </div>
                <h3 className="mt-3 text-lg font-black text-white">{step.t}</h3>
                <p className="mt-1 text-sm leading-7 text-cyan-100/65">{step.d}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="defer-render mx-auto max-w-7xl px-4 py-14">
        <div className="switch-surface relative overflow-hidden rounded-3xl p-8 sm:p-12">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/12 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/12 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-bold text-cyan-300">الدعم الرسمي</p>
              <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                فريق Switch معك عند الحاجة
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-cyan-100/72 sm:text-base">
                أرسل رقم الطلب وتفاصيل المشكلة، وسيتابع الفريق حالة الدفع أو التسليم عبر القنوات الرسمية.
              </p>
            </div>
            <Link to="/contact" className="switch-button-primary min-h-12 px-6 py-3.5">
              تواصل معنا
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroProductStack() {
  return (
    <div
      className="relative mx-auto hidden h-[520px] w-full max-w-[560px] animate-tilt-in lg:block"
      aria-hidden="true"
    >
      <div className="absolute inset-8 rounded-[48px] border border-cyan-100/10 bg-white/[0.02] shadow-[0_60px_130px_-65px_oklch(0.82_0.18_210/0.72)] backdrop-blur-xl" />
      {popular.slice(0, 3).map((product, index) => (
        <div
          key={product.id}
          className="absolute aspect-[4/3] w-[330px] overflow-hidden rounded-3xl border border-cyan-100/14 bg-[oklch(0.1_0.04_270)] shadow-2xl"
          style={{
            right: `${54 + index * 54}px`,
            top: `${52 + index * 72}px`,
            transform: `rotate(${index === 0 ? 7 : index === 1 ? -3 : -11}deg)`,
            zIndex: 3 - index,
          }}
        >
          <ProductArtwork product={product} />
        </div>
      ))}
      <div className="absolute bottom-8 left-4 z-10 rounded-2xl border border-emerald-300/18 bg-[oklch(0.11_0.04_260/0.86)] px-5 py-4 shadow-2xl backdrop-blur-xl">
        <div className="text-[10px] font-black text-emerald-300">DELIVERY STATUS</div>
        <div className="mt-1 flex items-center gap-2 text-sm font-black text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_oklch(0.8_0.2_155)]" />
          جاهز للتسليم الرقمي
        </div>
      </div>
    </div>
  );
}

function ProductSection({
  title,
  subtitle,
  link,
  children,
}: {
  title: string;
  subtitle?: string;
  link: string;
  children: ReactNode;
}) {
  return (
    <section className="defer-render mx-auto max-w-7xl px-4 py-11">
      <SectionHeading
        title={title}
        description={subtitle}
        action={
          <Link to={link} className="switch-section-link">
            عرض الكل
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />
      <div className="mt-7">{children}</div>
    </section>
  );
}
