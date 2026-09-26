import { getZidConfig, listZidProducts } from "./client.server";
import type { ZidConfig, ZidProductListResponse } from "./types";

export interface ZidReadinessResult {
  configured: boolean;
  authorized: boolean;
  status: "missing_configuration" | "authorization_failed" | "ready";
}

type ZidReadProbe = (config: ZidConfig) => Promise<ZidProductListResponse>;

export async function checkZidReadiness(
  env: Record<string, string | undefined> = process.env,
  probe?: ZidReadProbe
): Promise<ZidReadinessResult> {
  let config: ZidConfig;
  try {
    config = getZidConfig(env);
  } catch {
    return { configured: false, authorized: false, status: "missing_configuration" };
  }

  try {
    if (probe) {
      await probe(config);
    } else {
      await listZidProducts(1, 1, config);
    }
    return { configured: true, authorized: true, status: "ready" };
  } catch {
    return { configured: true, authorized: false, status: "authorization_failed" };
  }
}
