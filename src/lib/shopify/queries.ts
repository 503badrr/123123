/**
 * Shopify Storefront GraphQL documents.
 *
 * Contract: pinned and reviewed against Storefront API 2026-07.
 */

// ============================================
// Shared fragments
// ============================================

export const PRODUCT_FRAGMENT = `
  fragment ProductFragment on Product {
    id
    handle
    title
    description
    vendor
    productType
    publishedAt
    tags
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 10) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    variants(first: 100) {
      nodes {
        id
        title
        sku
        barcode
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        available: availableForSale
        selectedOptions {
          name
          value
        }
        image {
          id
          url
          altText
          width
          height
        }
      }
    }
  }
`;

export const CART_LINE_FRAGMENT = `
  fragment CartLineFragment on CartLine {
    id
    quantity
    cost {
      totalAmount {
        amount
        currencyCode
      }
      subtotalAmount {
        amount
        currencyCode
      }
      compareAtAmountPerQuantity {
        amount
        currencyCode
      }
    }
    merchandise {
      ... on ProductVariant {
        id
        title
        sku
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        available: availableForSale
        selectedOptions {
          name
          value
        }
        image {
          id
          url
          altText
          width
          height
        }
        product {
          id
          handle
          title
        }
      }
    }
    attributes {
      key
      value
    }
  }
`;

export const CART_FRAGMENT = `
  fragment CartFragment on Cart {
    id
    checkoutUrl
    createdAt
    updatedAt
    lines(first: 100) {
      nodes {
        ...CartLineFragment
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
    cost {
      totalAmount {
        amount
        currencyCode
      }
      subtotalAmount {
        amount
        currencyCode
      }
    }
    buyerIdentity {
      email
      phone
      customer {
        id
        email
        firstName
        lastName
      }
    }
    note
    attributes {
      key
      value
    }
  }
  ${CART_LINE_FRAGMENT}
`;

// ============================================
// Product queries
// ============================================

export const GET_PRODUCTS_QUERY = `
  query GetProducts(
    $first: Int!
    $after: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $query: String
  ) {
    products(
      first: $first
      after: $after
      sortKey: $sortKey
      reverse: $reverse
      query: $query
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        ...ProductFragment
      }
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const GET_PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...ProductFragment
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const GET_PRODUCTS_BY_IDS_QUERY = `
  query GetProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        ...ProductFragment
      }
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts(
    $query: String!
    $first: Int!
    $after: String
  ) {
    search(
      query: $query
      first: $first
      after: $after
      types: PRODUCT
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        ... on Product {
          ...ProductFragment
        }
      }
    }
  }
  ${PRODUCT_FRAGMENT}
`;

// ============================================
// Collection queries
// ============================================

export const GET_COLLECTIONS_QUERY = `
  query GetCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        id
        handle
        title
        description
        image {
          id
          url
          altText
          width
          height
        }
      }
    }
  }
`;

export const GET_COLLECTION_BY_HANDLE_QUERY = `
  query GetCollectionByHandle(
    $handle: String!
    $first: Int!
    $after: String
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
  ) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        id
        url
        altText
        width
        height
      }
      products(
        first: $first
        after: $after
        sortKey: $sortKey
        reverse: $reverse
      ) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          ...ProductFragment
        }
      }
    }
  }
  ${PRODUCT_FRAGMENT}
`;

// ============================================
// Cart mutations and queries
// ============================================

export const CREATE_CART_MUTATION = `
  mutation CreateCart($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const ADD_TO_CART_MUTATION = `
  mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const UPDATE_CART_LINES_MUTATION = `
  mutation UpdateCartLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const REMOVE_FROM_CART_MUTATION = `
  mutation RemoveFromCart($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

export const GET_CART_QUERY = `
  query GetCart($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }
  ${CART_FRAGMENT}
`;

export const UPDATE_CART_BUYER_IDENTITY_MUTATION = `
  mutation UpdateCartBuyerIdentity(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
  ) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartFragment
      }
      userErrors {
        field
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

// ============================================
// Additional queries
// ============================================

export const GET_VARIANT_AVAILABILITY_QUERY = `
  query GetVariantAvailability($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        id
        available: availableForSale
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
`;

export const GET_SHOP_INFO_QUERY = `
  query GetShopInfo {
    shop {
      id
      name
      description
      primaryDomain {
        url
        host
      }
      shipsToCountries
    }
  }
`;

/**
 * Legacy-customer-account order lookup.
 * Requires a customer access token and the Storefront customer scope.
 * The server privileged proxy permits this named operation only when that
 * proxy is explicitly enabled.
 */
export const GET_CUSTOMER_ORDERS_QUERY = `
  query GetCustomerOrders($customerAccessToken: String!, $first: Int!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      email
      firstName
      lastName
      orders(first: $first) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          id
          name
          orderNumber
          processedAt
          totalPrice {
            amount
            currencyCode
          }
          financialStatus
          fulfillmentStatus
          lineItems(first: 100) {
            nodes {
              title
              quantity
              variant {
                id
                title
                sku
              }
            }
          }
        }
      }
    }
  }
`;

// ============================================
// Variable types
// ============================================

export interface GetProductsVariables {
  first: number;
  after?: string | null;
  sortKey?: "TITLE" | "PRICE" | "CREATED_AT" | "UPDATED_AT" | "RELEVANCE";
  reverse?: boolean;
  query?: string;
}

export interface GetProductByHandleVariables {
  handle: string;
}

export interface SearchProductsVariables {
  query: string;
  first: number;
  after?: string | null;
}

export interface GetCollectionByHandleVariables {
  handle: string;
  first: number;
  after?: string | null;
  sortKey?: "COLLECTION_DEFAULT" | "PRICE" | "TITLE";
  reverse?: boolean;
}

export interface CreateCartVariables {
  input: {
    lines?: Array<{
      merchandiseId: string;
      quantity: number;
    }>;
    buyerIdentity?: {
      email?: string;
      phone?: string;
    };
    attributes?: Array<{
      key: string;
      value: string;
    }>;
    note?: string;
  };
}

export interface AddToCartVariables {
  cartId: string;
  lines: Array<{
    merchandiseId: string;
    quantity: number;
    attributes?: Array<{
      key: string;
      value: string;
    }>;
  }>;
}

export interface UpdateCartLinesVariables {
  cartId: string;
  lines: Array<{
    id: string;
    quantity?: number;
    attributes?: Array<{
      key: string;
      value: string;
    }>;
  }>;
}

export interface RemoveFromCartVariables {
  cartId: string;
  lineIds: string[];
}

export interface GetCartVariables {
  cartId: string;
}

export interface UpdateCartBuyerIdentityVariables {
  cartId: string;
  buyerIdentity: {
    email?: string;
    phone?: string;
    customerAccessToken?: string;
  };
}

export interface GetCustomerOrdersVariables {
  customerAccessToken: string;
  first: number;
}
