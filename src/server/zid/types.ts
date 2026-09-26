export type ZidProductClass = "voucher" | "downloadable";

export interface ZidConfig {
  authorizationToken: string;
  managerToken: string;
  storeId: string;
  baseUrl: string;
  writesEnabled: boolean;
}

export interface ShopifyProductForZid {
  title: string;
  description: string;
  productType: string;
  tags: string[];
  variant: {
    sku: string | null;
    price: string;
    compareAtPrice: string | null;
  };
}

export interface ZidProductWritePayload {
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  short_description: {
    ar: string;
    en: string;
  };
  sku: string;
  price: number;
  sale_price: number | null;
  product_class: ZidProductClass;
  requires_shipping: false;
  is_draft: true;
  is_published: false;
}

export interface ZidProductListItem {
  id: string;
  product_class: string | null;
  sku: string | null;
  name: { ar?: string; en?: string } | string;
  price: number;
  sale_price?: number | null;
}

export interface ZidProductListResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: ZidProductListItem[];
}
