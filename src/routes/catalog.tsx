import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { categoryLabels, products, type Category } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { SectionHeading } from "../components/SectionHeading";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "الكتالوج | Switch" },
      {
        name: "description",
        content: "تصفح كل منتجات Switch: ألعاب، بطاقات، اشتراكات، عروض.",
      },
      { property: "og:title", content: "كتالوج Switch" },
      { property: "og:description", content: "كل منتجات Switch في مكان واحد." },
    ],
  }),
  component: Catalog,
});

const filters: Array<{ key: "all" | Category; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "games", label: categoryLabels.games },
  { key: "cards", label: categoryLabels.cards },
  { key: "subscriptions", label: categoryLabels.subscriptions },
  { key: "offers", label: categoryLabels.offers },
];

function Catalog() {
  const [active, setActive] = useState<"all" | Category>("all");
  const list =
    active === "all" ? products : products.filter((product) => product.category === active);

  return (
    <div className="mx-auto max-w-7xl px-4 py-9 sm:py-12">
      <SectionHeading
        as="h1"
        title="الكتالوج"
        description="كل ما نقدمه في Switch، مرتب حسب الألعاب والبطاقات والاشتراكات والعروض."
      />

      <div
        className="switch-surface mt-7 flex flex-wrap gap-2 rounded-2xl p-2"
        role="group"
        aria-label="تصفية المنتجات حسب الفئة"
      >
        {filters.map((filter) => {
          const selected = active === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActive(filter.key)}
              aria-pressed={selected}
              className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs font-black outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300 sm:text-sm ${
                selected
                  ? "border border-cyan-100/15 bg-cyan-200/[0.1] text-white shadow-inner"
                  : "text-cyan-50/68 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div
        className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        aria-live="polite"
        aria-label={productCountLabel(list.length)}
      >
        {list.length > 0 ? (
          list.map((product) => <ProductCard key={product.id} product={product} />)
        ) : (
          <div className="switch-surface col-span-full rounded-3xl px-6 py-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-100/12 bg-cyan-200/[0.07] text-cyan-200">
              <PackageSearch className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-lg font-black text-white">
              لا توجد منتجات في هذه الفئة حاليًا
            </h2>
            <p className="mt-2 text-sm text-cyan-100/60">
              جرّب فئة أخرى لعرض المنتجات المتاحة.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function productCountLabel(count: number) {
  if (count === 0) return "لا توجد منتجات";
  if (count === 1) return "منتج واحد";
  if (count === 2) return "منتجان";
  if (count <= 10) return `${count} منتجات`;
  return `${count} منتج`;
}
