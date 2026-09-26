export type Category = "games" | "cards" | "subscriptions" | "offers";

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  oldPrice?: number;
  tag?: string;
  description: string;
  gradient: string;
  icon: string;
}

// Storefront inventory must come from verified production sources.
// Keep this legacy local catalog empty so demo/placeholder products cannot appear as fallback content.
export const products: Product[] = [];

export const getById = (id: string) => products.find((p) => p.id === id);
export const byCategory = (c: Category) => products.filter((p) => p.category === c);

export const categoryLabels: Record<Category, string> = {
  games: "الألعاب",
  cards: "البطاقات",
  subscriptions: "الاشتراكات",
  offers: "العروض",
};
