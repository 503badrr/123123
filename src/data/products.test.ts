import { describe, it, expect } from "vitest";
import {
  products,
  getById,
  byCategory,
  categoryLabels,
  type Category,
} from "../data/products";

describe("placeholder products data", () => {
  it("does not ship placeholder storefront products", () => {
    expect(products).toEqual([]);
  });

  it("does not resolve known placeholder product ids", () => {
    expect(getById("pubg-660")).toBeUndefined();
    expect(getById("bundle-gamer")).toBeUndefined();
    expect(getById("netflix-1m")).toBeUndefined();
  });

  it("returns no placeholder products for every category", () => {
    const categories: Category[] = ["games", "cards", "subscriptions", "offers"];
    for (const category of categories) {
      expect(byCategory(category)).toEqual([]);
    }
  });

  it("keeps category labels available for empty-state navigation", () => {
    const categories: Category[] = ["games", "cards", "subscriptions", "offers"];
    for (const category of categories) {
      expect(categoryLabels[category]).toBeTruthy();
    }
  });
});
