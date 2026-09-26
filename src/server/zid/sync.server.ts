import {
  createZidProduct,
  listZidProducts,
  mapShopifyProductToZid,
  updateZidProduct,
} from "./client.server";
import type {
  ShopifyProductForZid,
  ZidProductListResponse,
  ZidProductWritePayload,
} from "./types";

interface ZidSyncDependencies {
  list: (page: number, pageSize: number) => Promise<ZidProductListResponse>;
  create: (payload: ZidProductWritePayload) => Promise<unknown>;
  update: (id: string, payload: Partial<ZidProductWritePayload>) => Promise<unknown>;
}

interface ZidSyncOptions {
  dryRun?: boolean;
  maxPages?: number;
}

export interface ZidSyncResult {
  action: "create" | "update";
  executed: boolean;
  sku: string;
  zidProductId: string | null;
  payload: ZidProductWritePayload;
}

const defaultDependencies: ZidSyncDependencies = {
  list: listZidProducts,
  create: createZidProduct,
  update: updateZidProduct,
};

async function findZidProductBySku(
  sku: string,
  deps: ZidSyncDependencies,
  maxPages: number
): Promise<{ id: string; sku: string | null } | null> {
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await deps.list(page, 100);
    const match = response.results.find((product) => product.sku?.trim() === sku);
    if (match) return { id: match.id, sku: match.sku };
    if (!response.next || response.results.length === 0) return null;
  }

  throw new Error(`Zid product search exceeded ${maxPages} pages for SKU ${sku}`);
}

export async function syncShopifyProductToZid(
  product: ShopifyProductForZid,
  options: ZidSyncOptions = {},
  deps: ZidSyncDependencies = defaultDependencies
): Promise<ZidSyncResult> {
  const payload = mapShopifyProductToZid(product);
  const dryRun = options.dryRun !== false;
  const maxPages = Math.min(50, Math.max(1, Math.trunc(options.maxPages ?? 20)));
  const existing = await findZidProductBySku(payload.sku, deps, maxPages);
  const action = existing ? "update" : "create";

  if (!dryRun) {
    if (existing) {
      await deps.update(existing.id, payload);
    } else {
      await deps.create(payload);
    }
  }

  return {
    action,
    executed: !dryRun,
    sku: payload.sku,
    zidProductId: existing?.id ?? null,
    payload,
  };
}
