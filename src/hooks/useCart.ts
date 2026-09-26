/**
 * Hook لإدارة سلة التسوق من Shopify
 * يتعامل مع إنشاء السلة وإضافة/تحديث/إزالة المنتجات
 * مع المصادقة والخطأ والـ Loading
 */

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shopifyClient } from "@/lib/shopify/client";
import type { ShopifyCart, CartLine } from "@/lib/shopify/types";
import {
  CREATE_CART_MUTATION,
  ADD_TO_CART_MUTATION,
  REMOVE_FROM_CART_MUTATION,
  UPDATE_CART_LINES_MUTATION,
  GET_CART_QUERY,
  type CreateCartVariables,
  type AddToCartVariables,
  type RemoveFromCartVariables,
  type UpdateCartLinesVariables,
  type GetCartVariables,
} from "@/lib/shopify/queries";

// ============================================
// ثوابت
// ============================================

const CART_ID_STORAGE_KEY = "shopify_cart_id";
const CART_QUERY_KEY = ["shopify", "cart"];

// ============================================
// Hooks إنشاء وجلب السلة
// ============================================

/**
 * Hook لإنشاء سلة جديدة
 */
export function useCreateCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: CreateCartVariables) => {
      const response = await shopifyClient.mutation<{
        cartCreate: {
          cart: ShopifyCart;
          userErrors: Array<{ field: string; message: string }>;
        };
      }>(CREATE_CART_MUTATION, variables);

      if (response.cartCreate.userErrors.length > 0) {
        const error = response.cartCreate.userErrors[0];
        throw new Error(`خطأ في إنشاء السلة: ${error.message}`);
      }

      return response.cartCreate.cart;
    },
    onSuccess: (cart) => {
      // حفظ معرف السلة في localStorage
      localStorage.setItem(CART_ID_STORAGE_KEY, cart.id);
      // تحديث cache React Query
      queryClient.setQueryData(CART_QUERY_KEY, cart);
    },
    onError: (error) => {
      console.error("خطأ في useCreateCart:", error);
    },
  });
}

/**
 * Hook لجلب السلة الحالية
 */
export function useCart(cartId?: string | null) {
  const [storedCartId, setStoredCartId] = useState<string | null>(null);

  // تحميل معرف السلة من localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_ID_STORAGE_KEY);
      setStoredCartId(stored);
    } catch {
      // تجاهل أخطاء localStorage
    }
  }, []);

  const finalCartId = cartId || storedCartId;

  return useQuery({
    queryKey: [...CART_QUERY_KEY, finalCartId],
    queryFn: async () => {
      if (!finalCartId) {
        return null;
      }

      const variables: GetCartVariables = {
        cartId: finalCartId,
      };

      const response = await shopifyClient.query<{ cart: ShopifyCart | null }>(
        GET_CART_QUERY,
        variables
      );

      return response.cart;
    },
    enabled: !!finalCartId,
    staleTime: 1000 * 60 * 5, // 5 دقائق
    retry: 1,
  });
}

// ============================================
// Hooks عمليات السلة
// ============================================

/**
 * Hook لإضافة منتج إلى السلة
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: AddToCartVariables) => {
      const response = await shopifyClient.mutation<{
        cartLinesAdd: {
          cart: ShopifyCart;
          userErrors: Array<{ field: string; message: string }>;
        };
      }>(ADD_TO_CART_MUTATION, variables);

      if (response.cartLinesAdd.userErrors.length > 0) {
        const error = response.cartLinesAdd.userErrors[0];
        throw new Error(`خطأ في إضافة المنتج: ${error.message}`);
      }

      return response.cartLinesAdd.cart;
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
    },
  });
}

/**
 * Hook لإزالة منتج من السلة
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: RemoveFromCartVariables) => {
      const response = await shopifyClient.mutation<{
        cartLinesRemove: {
          cart: ShopifyCart;
          userErrors: Array<{ field: string; message: string }>;
        };
      }>(REMOVE_FROM_CART_MUTATION, variables);

      if (response.cartLinesRemove.userErrors.length > 0) {
        const error = response.cartLinesRemove.userErrors[0];
        throw new Error(`خطأ في إزالة المنتج: ${error.message}`);
      }

      return response.cartLinesRemove.cart;
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
    },
  });
}

/**
 * Hook لتحديث كمية المنتجات في السلة
 */
export function useUpdateCartLines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: UpdateCartLinesVariables) => {
      const response = await shopifyClient.mutation<{
        cartLinesUpdate: {
          cart: ShopifyCart;
          userErrors: Array<{ field: string; message: string }>;
        };
      }>(UPDATE_CART_LINES_MUTATION, variables);

      if (response.cartLinesUpdate.userErrors.length > 0) {
        const error = response.cartLinesUpdate.userErrors[0];
        throw new Error(`خطأ في تحديث السلة: ${error.message}`);
      }

      return response.cartLinesUpdate.cart;
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
    },
  });
}

// ============================================
// دالة مساعدة عالية المستوى: useCartManager
// ============================================

export interface CartManagerOptions {
  autoCreateCart?: boolean;
  persistCartId?: boolean;
}

/**
 * Hook شامل لإدارة السلة
 * يوفر واجهة عالية المستوى للعمليات الشائعة
 */
export function useCartManager(options: CartManagerOptions = {}) {
  const {
    autoCreateCart = true,
    persistCartId = true,
  } = options;

  const [cartId, setCartId] = useState<string | null>(() => {
    if (!persistCartId) return null;
    try {
      return localStorage.getItem(CART_ID_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // الـ Queries و Mutations
  const cartQuery = useCart(cartId);
  const createCartMutation = useCreateCart();
  const addToCartMutation = useAddToCart();
  const removeFromCartMutation = useRemoveFromCart();
  const updateCartLinesMutation = useUpdateCartLines();

  // إنشاء سلة تلقائية إذا كنا بحاجة إلى واحدة
  useEffect(() => {
    if (
      autoCreateCart &&
      !cartId &&
      !createCartMutation.isPending &&
      !cartQuery.isLoading
    ) {
      createCartMutation.mutate({
        input: {
          lines: [],
        },
      });
    }
  }, [autoCreateCart, cartId, createCartMutation, cartQuery.isLoading]);

  // تحديث معرف السلة عند الإنشاء الناجح
  useEffect(() => {
    if (createCartMutation.data?.id) {
      setCartId(createCartMutation.data.id);
      if (persistCartId) {
        localStorage.setItem(CART_ID_STORAGE_KEY, createCartMutation.data.id);
      }
    }
  }, [createCartMutation.data?.id, persistCartId]);

  // ============================================
  // دوال السلة
  // ============================================

  const addProduct = useCallback(
    async (
      merchandiseId: string,
      quantity: number = 1,
      attributes?: Array<{ key: string; value: string }>
    ) => {
      if (!cartId) {
        throw new Error("لا توجد سلة نشطة");
      }

      return addToCartMutation.mutateAsync({
        cartId,
        lines: [
          {
            merchandiseId,
            quantity,
            ...(attributes && { attributes }),
          },
        ],
      });
    },
    [cartId, addToCartMutation]
  );

  const removeProduct = useCallback(
    async (lineId: string) => {
      if (!cartId) {
        throw new Error("لا توجد سلة نشطة");
      }

      return removeFromCartMutation.mutateAsync({
        cartId,
        lineIds: [lineId],
      });
    },
    [cartId, removeFromCartMutation]
  );

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cartId) {
        throw new Error("لا توجد سلة نشطة");
      }

      if (quantity <= 0) {
        return removeProduct(lineId);
      }

      return updateCartLinesMutation.mutateAsync({
        cartId,
        lines: [
          {
            id: lineId,
            quantity,
          },
        ],
      });
    },
    [cartId, updateCartLinesMutation, removeProduct]
  );

  const clearCart = useCallback(
    async () => {
      const cart = cartQuery.data;
      if (!cart || !cartId || cart.lines.nodes.length === 0) {
        return;
      }

      const lineIds = cart.lines.nodes.map((line: CartLine) => line.id);
      return removeFromCartMutation.mutateAsync({
        cartId,
        lineIds,
      });
    },
    [cartId, cartQuery.data, removeFromCartMutation]
  );

  // ============================================
  // حساب المجاميع
  // ============================================

  const cart = cartQuery.data;
  const lineCount = cart?.lines.nodes.length ?? 0;
  const subtotal = cart?.cost.subtotalAmount.amount ?? "0";
  const total = cart?.cost.totalAmount.amount ?? "0";
  const checkoutUrl = cart?.checkoutUrl ?? null;

  return {
    // حالة السلة
    cart,
    cartId,
    lineCount,
    subtotal,
    total,
    checkoutUrl,

    // حالة التحميل
    isLoading: cartQuery.isLoading || createCartMutation.isPending,
    isError: cartQuery.isError,
    error: cartQuery.error || createCartMutation.error,

    // دوال
    addProduct,
    removeProduct,
    updateQuantity,
    clearCart,
    refetchCart: cartQuery.refetch,

    // حالة العمليات المتقدمة
    isPending:
      addToCartMutation.isPending ||
      removeFromCartMutation.isPending ||
      updateCartLinesMutation.isPending,
  };
}

// ============================================
// دوال مساعدة
// ============================================

/**
 * حذف معرف السلة المحفوظ
 */
export function clearStoredCartId(): void {
  try {
    localStorage.removeItem(CART_ID_STORAGE_KEY);
  } catch {
    // تجاهل الأخطاء
  }
}

/**
 * الحصول على معرف السلة المحفوظ
 */
export function getStoredCartId(): string | null {
  try {
    return localStorage.getItem(CART_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}
