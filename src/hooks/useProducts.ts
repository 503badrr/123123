/**
 * Hooks لجلب المنتجات والمجموعات من Shopify
 * مع دعم الترقيم والتصفية والبحث
 */

import { useQuery } from "@tanstack/react-query";
import { shopifyClient } from "@/lib/shopify/client";
import type { ShopifyProduct, ShopifyCollection } from "@/lib/shopify/types";
import {
  GET_PRODUCTS_QUERY,
  GET_PRODUCT_BY_HANDLE_QUERY,
  GET_COLLECTIONS_QUERY,
  GET_COLLECTION_BY_HANDLE_QUERY,
  SEARCH_PRODUCTS_QUERY,
  type GetProductsVariables,
  type GetProductByHandleVariables,
  type SearchProductsVariables,
  type GetCollectionByHandleVariables,
} from "@/lib/shopify/queries";

const PRODUCTS_QUERY_KEY = ["shopify", "products"];
const COLLECTIONS_QUERY_KEY = ["shopify", "collections"];

interface UseProductsOptions {
  first?: number;
  after?: string | null;
  sortKey?: "TITLE" | "PRICE" | "CREATED_AT" | "UPDATED_AT" | "RELEVANCE";
  reverse?: boolean;
  query?: string;
}

export function useProducts(options: UseProductsOptions = {}) {
  const {
    first = 12,
    after = null,
    sortKey = "CREATED_AT",
    reverse = false,
    query: searchQuery,
  } = options;

  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, { first, after, sortKey, reverse, searchQuery }],
    queryFn: async () => {
      const variables: GetProductsVariables = {
        first,
        after: after || undefined,
        sortKey,
        reverse,
        ...(searchQuery && { query: searchQuery }),
      };

      const response = await shopifyClient.query<{
        products: {
          pageInfo: {
            hasNextPage: boolean;
            hasPreviousPage: boolean;
            startCursor: string | null;
            endCursor: string | null;
          };
          nodes: ShopifyProduct[];
        };
      }>(GET_PRODUCTS_QUERY, variables);

      return response.products;
    },
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });
}

export function useProductByHandle(handle?: string | null) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, "byHandle", handle],
    queryFn: async () => {
      if (!handle) {
        return null;
      }

      const variables: GetProductByHandleVariables = { handle };
      const response = await shopifyClient.query<{ product: ShopifyProduct | null }>(
        GET_PRODUCT_BY_HANDLE_QUERY,
        variables
      );

      return response.product;
    },
    enabled: !!handle,
    staleTime: 1000 * 60 * 15,
    retry: 2,
  });
}

export function useSearchProducts(query: string, options: { first?: number } = {}) {
  const { first = 20 } = options;

  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, "search", query, { first }],
    queryFn: async () => {
      if (query.length < 2) {
        return {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          nodes: [] as ShopifyProduct[],
        };
      }

      const variables: SearchProductsVariables = {
        query: `*${query}*`,
        first,
      };

      const response = await shopifyClient.query<{
        search: {
          pageInfo: {
            hasNextPage: boolean;
            hasPreviousPage: boolean;
            startCursor: string | null;
            endCursor: string | null;
          };
          nodes: ShopifyProduct[];
        };
      }>(SEARCH_PRODUCTS_QUERY, variables);

      return response.search;
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

interface UseCollectionsOptions {
  first?: number;
  after?: string | null;
}

export function useCollections(options: UseCollectionsOptions = {}) {
  const { first = 10, after = null } = options;

  return useQuery({
    queryKey: [...COLLECTIONS_QUERY_KEY, { first, after }],
    queryFn: async () => {
      const response = await shopifyClient.query<{
        collections: {
          pageInfo: {
            hasNextPage: boolean;
            hasPreviousPage: boolean;
            startCursor: string | null;
            endCursor: string | null;
          };
          nodes: Array<{
            id: string;
            handle: string;
            title: string;
            description: string;
            image: {
              id: string;
              url: string;
              altText: string | null;
              width: number;
              height: number;
            } | null;
          }>;
        };
      }>(GET_COLLECTIONS_QUERY, {
        first,
        after: after || undefined,
      });

      return response.collections;
    },
    staleTime: 1000 * 60 * 20,
    retry: 2,
  });
}

interface UseCollectionByHandleOptions {
  handle?: string | null;
  first?: number;
  after?: string | null;
  sortKey?: "COLLECTION_DEFAULT" | "PRICE" | "TITLE";
  reverse?: boolean;
}

export function useCollectionByHandle(options: UseCollectionByHandleOptions = {}) {
  const {
    handle,
    first = 12,
    after = null,
    sortKey = "COLLECTION_DEFAULT",
    reverse = false,
  } = options;

  return useQuery({
    queryKey: [
      ...COLLECTIONS_QUERY_KEY,
      "byHandle",
      handle,
      { first, after, sortKey, reverse },
    ],
    queryFn: async () => {
      if (!handle) {
        return null;
      }

      const variables: GetCollectionByHandleVariables = {
        handle,
        first,
        after: after || undefined,
        sortKey,
        reverse,
      };

      const response = await shopifyClient.query<{
        collection: ShopifyCollection | null;
      }>(GET_COLLECTION_BY_HANDLE_QUERY, variables);

      return response.collection;
    },
    enabled: !!handle,
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });
}

interface PriceInfo {
  minPrice: number;
  maxPrice: number;
  displayPrice: string;
  hasDiscount: boolean;
  discountPercentage: number;
}

function parseFiniteMoneyAmount(amount: string): number | null {
  const parsed = Number.parseFloat(amount);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useProductPricing(product: ShopifyProduct | null | undefined): PriceInfo | null {
  if (!product) {
    return null;
  }

  const minPrice = parseFiniteMoneyAmount(product.priceRange.minVariantPrice.amount);
  const maxPrice = parseFiniteMoneyAmount(product.priceRange.maxVariantPrice.amount);
  if (minPrice === null || maxPrice === null) {
    return null;
  }

  const minComparePrice = product.variants.nodes.reduce((min, variant) => {
    if (!variant.compareAtPrice) return min;
    const price = parseFiniteMoneyAmount(variant.compareAtPrice.amount);
    if (price === null) return min;
    return price > 0 && (min === 0 || price < min) ? price : min;
  }, 0);

  const hasDiscount = minComparePrice > 0 && minPrice < minComparePrice;
  const discountPercentage = hasDiscount
    ? Math.round(((minComparePrice - minPrice) / minComparePrice) * 100)
    : 0;

  const displayPrice =
    minPrice === maxPrice
      ? `${minPrice.toFixed(2)} ${product.priceRange.minVariantPrice.currencyCode}`
      : `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} ${product.priceRange.minVariantPrice.currencyCode}`;

  return {
    minPrice,
    maxPrice,
    displayPrice,
    hasDiscount,
    discountPercentage,
  };
}

interface VariantOption {
  name: string;
  values: string[];
}

export function useProductVariantOptions(
  product: ShopifyProduct | null | undefined
): VariantOption[] {
  if (!product) {
    return [];
  }

  const optionsMap = new Map<string, Set<string>>();

  for (const variant of product.variants.nodes) {
    for (const option of variant.selectedOptions) {
      let values = optionsMap.get(option.name);
      if (values === undefined) {
        values = new Set<string>();
        optionsMap.set(option.name, values);
      }
      values.add(option.value);
    }
  }

  return Array.from(optionsMap, ([name, values]) => ({
    name,
    values: Array.from(values).sort((a, b) => a.localeCompare(b)),
  }));
}

export function useFilteredVariants(
  product: ShopifyProduct | null | undefined,
  selectedOptions: Record<string, string> = {}
) {
  if (!product) {
    return [];
  }

  return product.variants.nodes.filter((variant) =>
    Object.entries(selectedOptions).every(([optionName, optionValue]) =>
      variant.selectedOptions.some(
        (option) => option.name === optionName && option.value === optionValue
      )
    )
  );
}
