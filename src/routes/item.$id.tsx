import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, ShoppingCart } from "lucide-react";
import { categoryLabels, getById, products } from "../data/products";
import { useCart } from "../store/cart";
import { ProductArtwork } from "../components/ProductArtwork";
import { ProductCard } from "../components/ProductCard";
import { useState } from "react";
import { absoluteUrl } from "../config/production";

export const Route = createFileRoute("/item/$id")({
  loader: ({ params }) => {
    const product = getById(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${loaderData?.product.name ?? "المنتج"} | Switch` },
      { name: "description", content: loaderData?.product.description ?? "" },
      { property: "og:title", content: loaderData?.product.name ?? "Switch" },
      {
        property: "og:description",
        content: loaderData?.product.description ?? "",
      },
      { property: "og:type", content: "product" },
      { property: "og:url", content: absoluteUrl(`/item/${params.id}`) },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl(`/item/${params.id}`) },
    ],
    scripts: loaderData?.product
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: loaderData.product.name,
              description: loaderData.product.description,
              brand: { "@type": "Brand", name: "Switch" },
              offers: {
                "@type": "Offer",
                price: loaderData.product.price,
                priceCurrency: "SAR",
                availability: "https://schema.org/InStock",
                url: absoluteUrl(`/item/${params.id}`),
              },
            }),
          },
        ]
      : [],
  }),
  component: ItemPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-black text-white">المنتج غير موجود</h1>
      <Link
        to="/catalog"
        className="mt-4 inline-flex rounded-xl cosmic-gradient px-4 py-2 text-sm font-bold text-[oklch(0.13_0.04_270)]"
      >
        العودة للكتالوج
      </Link>
    </div>
  ),
});

function ItemPage() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const related = products
    .filter(
      (candidate) =>
        candidate.category === product.category && candidate.id !== product.id,
    )
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl glass shadow-[0_30px_90px_-55px_oklch(0.82_0.18_210/0.9)]">
          <ProductArtwork product={product} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/[0.04]" />
          {product.tag && (
            <span className="absolute right-4 top-4 rounded-full cosmic-gradient px-3 py-1 text-xs font-bold text-[oklch(0.13_0.04_270)]">
              {product.tag}
            </span>
          )}
        </div>
        <div className="flex flex-col lg:py-3">
          <div className="text-xs font-bold text-cyan-300">
            {categoryLabels[product.category as keyof typeof categoryLabels]}
          </div>
          <h1 className="mt-1 text-3xl font-black leading-tight text-white sm:text-4xl">
            {product.name}
          </h1>
          <div className="mt-4 flex items-end gap-3">
            <div className="text-3xl font-black neon-text">
              {product.price} ر.س
            </div>
            {product.oldPrice && (
              <div className="pb-1 text-sm text-cyan-100/40 line-through">
                {product.oldPrice} ر.س
              </div>
            )}
          </div>
          <p className="mt-5 text-sm leading-7 text-cyan-100/80 sm:text-base">
            {product.description}
          </p>

          <ul className="mt-6 grid gap-3 text-sm text-cyan-100/85">
            {[
              "تسليم رقمي بعد تأكيد الدفع",
              "طلب متاح على مدار الساعة",
              "ضمان استرجاع في حال خطأ تقني",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full cosmic-gradient text-[oklch(0.13_0.04_270)]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                add(product.id);
                setAdded(true);
                window.setTimeout(() => setAdded(false), 1800);
              }}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl cosmic-gradient px-6 py-3 text-sm font-bold text-[oklch(0.13_0.04_270)] shadow-[0_0_30px_-6px_oklch(0.82_0.18_210/0.7)] outline-none transition hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.13_0.04_270)] sm:flex-none"
            >
              <ShoppingCart className="h-4 w-4" />
              {added ? "تمت الإضافة ✓" : "أضف للسلة"}
            </button>
            <Link
              to="/cart"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl glass-strong px-6 py-3 text-sm font-bold text-white outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-300 sm:flex-none"
            >
              عرض السلة
            </Link>
          </div>
          <span className="sr-only" aria-live="polite">
            {added ? `تمت إضافة ${product.name} إلى السلة` : ""}
          </span>

          <p className="mt-4 text-[11px] text-cyan-100/50">
            الدفع يتم عبر بوابة آمنة، ولا نخزّن بيانات بطاقتك.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section
          className="defer-render mt-12"
          aria-labelledby="related-products-title"
        >
          <h2
            id="related-products-title"
            className="mb-4 text-xl font-black text-white"
          >
            منتجات مشابهة
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((candidate) => (
              <ProductCard key={candidate.id} product={candidate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
