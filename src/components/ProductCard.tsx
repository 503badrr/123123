import { memo } from "react";
import { Link } from "@tanstack/react-router";
import type { Product } from "../data/products";
import { categoryLabels } from "../data/products";
import { ProductArtwork } from "./ProductArtwork";

export const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const titleId = `product-card-title-${product.id}`;
  const priceId = `product-card-price-${product.id}`;

  return (
    <Link
      to="/item/$id"
      params={{ id: product.id }}
      aria-labelledby={titleId}
      aria-describedby={priceId}
      className="switch-card switch-card-interactive group relative flex h-full flex-col overflow-hidden rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.13_0.04_270)]"
    >
      <div
        className="relative aspect-square overflow-hidden bg-[oklch(0.1_0.04_270)]"
        aria-hidden="true"
      >
        <ProductArtwork product={product} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/[0.025]" />
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        {product.tag ? (
          <span className="absolute right-2.5 top-2.5 rounded-full border border-cyan-100/15 bg-[oklch(0.12_0.05_270/0.88)] px-2.5 py-1 text-[10px] font-black text-cyan-100 shadow-lg backdrop-blur-md">
            {product.tag}
          </span>
        ) : null}
        <span className="absolute bottom-2.5 left-2.5 rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-bold text-cyan-50/85 backdrop-blur-md">
          {categoryLabels[product.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3
          id={titleId}
          className="line-clamp-2 text-sm font-black leading-6 text-white sm:text-[15px]"
        >
          {product.name}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div id={priceId} className="min-w-0">
            <div className="flex items-baseline gap-1 text-xl font-black text-cyan-200">
              <span>{product.price}</span>
              <span className="text-[11px] font-bold text-cyan-100/55">ر.س</span>
            </div>
            {product.oldPrice ? (
              <div className="mt-0.5 text-[11px] text-cyan-100/40 line-through">
                {product.oldPrice} ر.س
              </div>
            ) : null}
          </div>
          <span
            className="inline-flex min-h-9 shrink-0 items-center rounded-xl border border-cyan-100/10 bg-white/[0.045] px-3 text-[11px] font-black text-white transition group-hover:border-cyan-200/20 group-hover:bg-cyan-200/[0.08]"
            aria-hidden="true"
          >
            التفاصيل
          </span>
        </div>
      </div>
    </Link>
  );
});
