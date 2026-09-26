import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "../store/cart";
import { ProductArtwork } from "../components/ProductArtwork";
import { SectionHeading } from "../components/SectionHeading";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "السلة | Switch" },
      { name: "description", content: "راجع منتجاتك قبل تأكيد الطلب." },
      { property: "og:title", content: "سلة Switch" },
      {
        property: "og:description",
        content: "راجع المنتجات والكميات قبل إتمام الطلب.",
      },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { detailed, total, setQty, remove, clear } = useCart();

  if (detailed.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="switch-surface rounded-3xl p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-100/12 bg-cyan-200/[0.08] text-cyan-200">
            <ShoppingCart className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-white">السلة فارغة</h1>
          <p className="mt-2 text-sm leading-7 text-cyan-100/65">
            اختر منتجك، وستبقى السلة محفوظة حتى تعود.
          </p>
          <Link to="/catalog" className="switch-button-primary mt-6 min-h-12 px-6 py-3">
            تصفح الكتالوج
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-9 sm:py-12">
      <SectionHeading
        title="سلة مشترياتك"
        description="راجع المنتجات والكميات قبل متابعة الطلب."
        action={
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-bold text-cyan-100/55 outline-none transition hover:bg-rose-500/10 hover:text-rose-300 focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            إفراغ السلة
          </button>
        }
      />

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {detailed.map((item) => (
            <article
              key={item.id}
              className="switch-card grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl p-3.5"
            >
              <div
                className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-cyan-100/10"
                aria-hidden="true"
              >
                <ProductArtwork product={item.product} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-white">
                  {item.product.name}
                </h2>
                <div className="mt-1 text-xs font-black text-cyan-200">
                  {item.product.price} ر.س
                </div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-cyan-100/8 bg-white/[0.035] p-1">
                  <button
                    type="button"
                    onClick={() => setQty(item.id, item.qty - 1)}
                    className="grid h-9 w-9 place-items-center rounded-md outline-none transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-cyan-300"
                    aria-label={`تقليل كمية ${item.product.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span
                    className="min-w-8 text-center text-sm font-bold text-white"
                    aria-label={`الكمية ${item.qty}`}
                  >
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(item.id, item.qty + 1)}
                    className="grid h-9 w-9 place-items-center rounded-md outline-none transition hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-cyan-300"
                    aria-label={`زيادة كمية ${item.product.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-rose-300/10 bg-rose-500/[0.06] text-rose-300 outline-none transition hover:bg-rose-500/14 focus-visible:ring-2 focus-visible:ring-rose-300"
                aria-label={`حذف ${item.product.name} من السلة`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>

        <aside
          className="switch-surface h-fit rounded-2xl p-5 lg:sticky lg:top-24"
          aria-label="ملخص الطلب"
        >
          <h2 className="text-sm font-black text-white">ملخص الطلب</h2>
          <div className="mt-4 space-y-2.5 text-sm text-cyan-100/72">
            <Row label="المجموع الفرعي" value={`${total} ر.س`} />
            <Row label="الرسوم" value="0 ر.س" />
            <Row label="الخصم" value="—" />
          </div>
          <div className="mt-4 border-t border-cyan-100/10 pt-4">
            <div className="flex items-center justify-between" aria-live="polite">
              <span className="text-sm text-cyan-100/72">الإجمالي</span>
              <span className="text-2xl font-black text-cyan-200">{total} ر.س</span>
            </div>
          </div>
          <Link to="/checkout" className="switch-button-primary mt-5 flex min-h-12 w-full px-5 py-3">
            متابعة لإتمام الطلب
          </Link>
          <p className="mt-3 text-center text-[11px] leading-5 text-cyan-100/45">
            سيتم تحويلك إلى بوابة الدفع الآمنة لإتمام العملية.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}
