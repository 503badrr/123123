/**
 * نقطة التصدير الرئيسية لـ Shopify Integration
 * يسهل الاستيراد من مكان واحد
 */

// ============================================
// عميل GraphQL
// ============================================

export {
  shopifyClient,
  testShopifyConnection,
  logGraphQLError,
  extractShopifyId,
  buildShopifyId,
  ShopifyStorefrontClient,
} from "./client";

// ============================================
// الأنواع
// ============================================

export type {
  ShopifyProduct,
  ShopifyProductVariant,
  ShopifyProductImage,
  ShopifyCollection,
  ShopifyCart,
  CartLine,
  MoneyV2,
  PageInfo,
  GraphQLResponse,
  GraphQLError,
  ShopifyMetafield,
  ProductFiltersInput,
  CollectionProductsFilterInput,
  PaginationParams,
} from "./types";

// ============================================
// الاستعلامات والـ Mutations
// ============================================

export {
  // Fragments
  PRODUCT_FRAGMENT,
  CART_LINE_FRAGMENT,
  CART_FRAGMENT,
  // Queries
  GET_PRODUCTS_QUERY,
  GET_PRODUCT_BY_HANDLE_QUERY,
  GET_PRODUCTS_BY_IDS_QUERY,
  SEARCH_PRODUCTS_QUERY,
  GET_COLLECTIONS_QUERY,
  GET_COLLECTION_BY_HANDLE_QUERY,
  // Mutations
  CREATE_CART_MUTATION,
  ADD_TO_CART_MUTATION,
  UPDATE_CART_LINES_MUTATION,
  REMOVE_FROM_CART_MUTATION,
  GET_CART_QUERY,
  UPDATE_CART_BUYER_IDENTITY_MUTATION,
  // Advanced Queries
  GET_VARIANT_AVAILABILITY_QUERY,
  GET_SHOP_INFO_QUERY,
  GET_CUSTOMER_ORDERS_QUERY,
} from "./queries";

export type {
  GetProductsVariables,
  GetProductByHandleVariables,
  SearchProductsVariables,
  GetCollectionByHandleVariables,
  CreateCartVariables,
  AddToCartVariables,
  UpdateCartLinesVariables,
  RemoveFromCartVariables,
  GetCartVariables,
  UpdateCartBuyerIdentityVariables,
} from "./queries";
