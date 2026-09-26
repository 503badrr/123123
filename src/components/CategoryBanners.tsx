import { Link } from "@tanstack/react-router";
import { ArrowLeft, CreditCard, Gamepad2, Play } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const categories = [
  {
    to: "/games" as const,
    title: "الألعاب",
    description: "شحن سريع لأشهر الألعاب والمنصات",
    label: "ادخل المنافسة",
    icon: Gamepad2,
    className: "from-cyan-400/16 via-blue-600/10 to-indigo-900/24",
    glow: "bg-cyan-300/20",
  },
  {
    to: "/cards" as const,
    title: "البطاقات الرقمية",
    description: "بطاقات متاجر عالمية للحساب السعودي",
    label: "اختر بطاقتك",
    icon: CreditCard,
    className: "from-amber-300/14 via-orange-600/8 to-rose-900/20",
    glow: "bg-amber-300/18",
  },
  {
    to: "/subscriptions" as const,
    title: "الاشتراكات",
    description: "ترفيه وموسيقى وألعاب بلا انقطاع",
    label: "استكشف الباقات",
    icon: Play,
    className: "from-fuchsia-400/14 via-violet-600/9 to-purple-950/22",
    glow: "bg-fuchsia-300/18",
  },
];

export function CategoryBanners() {
  return (
    <section
      className="defer-render mx-auto max-w-7xl px-4 py-12"
      aria-labelledby="switch-categories-title"
    >
      <SectionHeading
        eyebrow="اختر عالمك"
        title="أقسام Switch الرئيسية"
        action={
          <Link to="/catalog" className="switch-section-link hidden sm:inline-flex">
            الكتالوج الكامل
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.to}
              to={category.to}
              className={`switch-card switch-card-interactive group relative min-h-56 overflow-hidden rounded-3xl bg-gradient-to-br ${category.className} p-6 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300`}
            >
              <div
                className={`pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full ${category.glow} blur-3xl transition duration-500 group-hover:scale-110`}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(oklch(1_0_0/10%)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/10%)_1px,transparent_1px)] [background-size:30px_30px]"
                aria-hidden="true"
              />
              <div className="relative flex h-full flex-col justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-100/12 bg-white/[0.06] text-white backdrop-blur-xl">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="mt-10">
                  <h3 className="text-2xl font-black text-white">{category.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-7 text-cyan-50/65">
                    {category.description}
                  </p>
                  <span className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-xs font-black text-cyan-100">
                    {category.label}
                    <ArrowLeft
                      className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
