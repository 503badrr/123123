import { describe, expect, it } from "vitest";
import { catalogPilotProducts, pilotDepartments, productsForDepartment } from "./catalog-pilot";

describe("catalog pilot", () => {
  it("covers the three approved departments", () => {
    expect(new Set(catalogPilotProducts.map((product) => product.department))).toEqual(
      new Set(pilotDepartments.map((department) => department.key)),
    );
  });

  it("keeps every pilot product blocked from sale", () => {
    for (const product of catalogPilotProducts) {
      expect(product.sellable).toBe(false);
      expect(product.price).toBeNull();
      expect(product.reviewChecks.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses unique SKUs and slugs", () => {
    const skus = catalogPilotProducts.map((product) => product.sku);
    const slugs = catalogPilotProducts.map((product) => product.slug);
    expect(new Set(skus).size).toBe(skus.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("filters products without changing the source catalog", () => {
    expect(productsForDepartment("all")).toHaveLength(catalogPilotProducts.length);
    expect(productsForDepartment("electronics")).toHaveLength(5);
    expect(productsForDepartment("subscriptions")).toHaveLength(2);
    expect(productsForDepartment("ai_assets")).toHaveLength(4);
  });
});
