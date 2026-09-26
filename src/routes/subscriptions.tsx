import { createFileRoute } from "@tanstack/react-router";
import { byCategory } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { PageHero } from "../components/PageHero";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { title: "الاشتراكات | Switch" },
      { name: "description", content: "اشتراكات نتفلكس، شاهد، سبوتيفاي، أنغامي و Game Pass." },
      { property: "og:title", content: "اشتراكات Switch" },
      { property: "og:description", content: "كل اشتراكاتك في مكان واحد." },
    ],
  }),
  component: SubsPage,
});

function SubsPage() {
  const items = byCategory("subscriptions");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero
        badge="اشتراكات"
        title="ترفيهك مستمر بلا انقطاع"
        subtitle="اشتراكات مختارة لمنصات المشاهدة والموسيقى والألعاب — جاهزة للتفعيل فور إتمام الطلب."
        gradient="from-fuchsia-500 to-violet-800"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
