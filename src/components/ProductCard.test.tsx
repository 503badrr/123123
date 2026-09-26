import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "../data/products";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    to,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    className?: string;
    to: string;
    params?: Record<string, string>;
    "aria-label"?: string;
  }) => (
    <a href={to} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

const mockProduct: Product = {
  id: "test-product",
  name: "منتج تجريبي",
  category: "games",
  price: 99,
  description: "وصف تجريبي للمنتج",
  gradient: "from-cyan-500/40 to-blue-700/40",
  icon: "🎮",
};

const mockProductWithTag: Product = {
  ...mockProduct,
  id: "test-product-tag",
  tag: "الأكثر مبيعًا",
  oldPrice: 129,
};

describe("ProductCard", () => {
  it("renders product name", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("منتج تجريبي")).toBeInTheDocument();
  });

  it("uses the product name as a semantic card heading", () => {
    render(<ProductCard product={mockProduct} />);
    expect(
      screen.getByRole("heading", { level: 3, name: "منتج تجريبي" }),
    ).toBeInTheDocument();
  });

  it("renders product price with currency", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("99")).toBeInTheDocument();
    expect(screen.getByText("ر.س")).toBeInTheDocument();
  });

  it("renders category label", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("الألعاب")).toBeInTheDocument();
  });

  it("renders tag when present", () => {
    render(<ProductCard product={mockProductWithTag} />);
    expect(screen.getByText("الأكثر مبيعًا")).toBeInTheDocument();
  });

  it("does not render tag when absent", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.queryByText("الأكثر مبيعًا")).not.toBeInTheDocument();
  });

  it("renders old price when present", () => {
    render(<ProductCard product={mockProductWithTag} />);
    expect(screen.getByText(/129/)).toBeInTheDocument();
  });

  it("does not render old price when absent", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.queryByText(/129/)).not.toBeInTheDocument();
  });

  it("renders a link to product detail page", () => {
    render(<ProductCard product={mockProduct} />);
    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
  });
});
