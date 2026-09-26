import { createFileRoute } from "@tanstack/react-router";
import { byCategory } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { PageHero } from "../components/PageHero";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "الألعاب | Switch" },
      { name: "description", content: "شدات وعملات لأشهر ألعاب الفيديو: ببجي، فورتنايت، فيفا، فالورانت والمزيد." },
      { property: "og:title", content: "ألعاب Switch" },
      { property: "og:description", content: "اشحن لعبتك المفضلة فورًا." },
    ],
  }),
  component: GamesPage,
});

function GamesPage() {
  const items = byCategory("games");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero
        badge="ألعاب"
        title="اشحن لعبتك وارجع للمنافسة"
        subtitle="شدات وعملات لأشهر ألعاب الفيديو — ببجي، فورتنايت، فيفا، فالورانت والمزيد. تسليم رقمي بعد تأكيد الدفع."
        gradient="from-cyan-500 to-blue-800"
        imageUrl="/banners/games-neon.png"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
