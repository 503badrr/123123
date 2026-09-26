import { createFileRoute } from "@tanstack/react-router";
import { byCategory } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { PageHero } from "../components/PageHero";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "البطاقات | Switch" },
      { name: "description", content: "بطاقات رقمية: iTunes، PSN، Steam، Xbox، Google Play." },
      { property: "og:title", content: "بطاقات Switch" },
      { property: "og:description", content: "كل البطاقات الرقمية التي تحتاجها." },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const items = byCategory("cards");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero
        badge="بطاقات"
        title="بطاقات رقمية جاهزة بعد الدفع"
        subtitle="بطاقات متاجر ومنصات عالمية مناسبة للحساب السعودي — كود سريع وآمن يصلك بعد تأكيد الدفع."
        gradient="from-amber-400 to-orange-700"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
