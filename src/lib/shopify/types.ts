/**
 * Types for Shopify Storefront API responses.
 */

// ============================================
// Products and collections
// ============================================

export interface ShopifyProductImage {
  id: string;
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice: {
    amount: string;
    currencyCode: string;
  } | null;
  /** GraphQL aliases ProductVariant.availableForSale to `available`. */
  available: boolean;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  image: ShopifyProductImage | null;
  /** Present when the variant is queried inside a CartLine. */
  product?: {
    id: string;
    handle: string;
    title: string;
  };
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  publishedAt: string;
  tags: string[];
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    nodes: ShopifyProductImage[];
  };
  variants: {
    nodes: ShopifyProductVariant[];
  };
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ShopifyProductImage | null;
  products: {
    pageInfo: PageInfo;
    nodes: ShopifyProduct[];
  };
}

// ============================================
// Cart and checkout
// ============================================

export interface CartLine {
  id: string;
  quantity: number;
  cost: {
    totalAmount: MoneyV2;
    subtotalAmount: MoneyV2;
    compareAtAmountPerQuantity: MoneyV2 | null;
  };
  merchandise: ShopifyProductVariant;
  attributes: Array<{
    key: string;
    value: string;
  }>;
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  createdAt: string;
  updatedAt: string;
  lines: {
    nodes: CartLine[];
    pageInfo: PageInfo;
  };
  cost: {
    totalAmount: MoneyV2;
    subtotalAmount: MoneyV2;
    totalTaxAmount: MoneyV2 | null;
    totalDutyAmount: MoneyV2 | null;
  };
  buyerIdentity: {
    email: string | null;
    phone: string | null;
    customer: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
  note: string | null;
  attributes: Array<{
    key: string;
    value: string;
  }>;
}

export interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

// ============================================
// Pagination
// ============================================

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface PaginationParams {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}

// ============================================
// GraphQL response types
// ============================================

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code: string;
    };
  }>;
}

export interface GraphQLError {
  message: string;
  extensions?: {
    code: string;
  };
}

// ============================================
// Metafields (future explicit-identifier queries)
// ============================================

export interface ShopifyMetafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

// ============================================
// Filtering and sorting
// ============================================

export interface ProductFiltersInput {
  query?: string;
  after?: string | null;
  first?: number;
  sortKey?: "TITLE" | "PRICE" | "CREATED_AT" | "UPDATED_AT" | "RELEVANCE";
  reverse?: boolean;
  productType?: string;
  vendor?: string;
  tag?: string;
}

export interface CollectionProductsFilterInput {
  first?: number;
  after?: string | null;
  sortKey?: "COLLECTION_DEFAULT" | "PRICE" | "TITLE";
  reverse?: boolean;
}
