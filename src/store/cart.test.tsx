import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "../store/cart";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

describe("useCart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with an empty cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.count).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it("adds a product id to the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.add("product-a");
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe("product-a");
    expect(result.current.items[0].qty).toBe(1);
    expect(result.current.count).toBe(1);
  });

  it("increments qty when adding an existing product id", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.add("product-a");
      result.current.add("product-a");
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(2);
    expect(result.current.count).toBe(2);
  });

  it("removes a product id from the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.add("product-a");
      result.current.remove("product-a");
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("sets quantity of a product id", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.add("product-a");
      result.current.setQty("product-a", 5);
    });
    expect(result.current.items[0].qty).toBe(5);
  });

  it("removes a product id when qty is set to 0", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.add("product-a");
      result.current.setQty("product-a", 0);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("clears the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.add("product-a");
      result.current.add("product-b");
      result.current.clear();
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.count).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it("does not calculate totals from ids without verified local product metadata", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.add("product-a");
      result.current.add("product-b");
    });
    expect(result.current.total).toBe(0);
    expect(result.current.detailed).toHaveLength(0);
  });

  it("caps quantity at MAX_ITEM_QTY (20)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.add("product-a");
      result.current.setQty("product-a", 99);
    });
    expect(result.current.items[0].qty).toBe(20);
  });

  it("does not include unknown product ids in detailed items or total", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.add("nonexistent-product");
    });
    expect(result.current.detailed).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("throws when useCart is used outside CartProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCart())).toThrow(
      "useCart must be used within CartProvider",
    );
    spy.mockRestore();
  });
});
