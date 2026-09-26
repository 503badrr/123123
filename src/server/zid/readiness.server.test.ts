import { describe, expect, it } from "vitest";
import { checkZidReadiness } from "./readiness.server";

describe("Zid readiness", () => {
  it("fails closed when runtime credentials are absent", async () => {
    const result = await checkZidReadiness({}, async () => ({ results: [] }));
    expect(result).toEqual({ configured: false, authorized: false, status: "missing_configuration" });
  });

  it("uses the supplied runtime config for the read-only authorization probe", async () => {
    const env = {
      ZID_AUTHORIZATION_TOKEN: "Bearer auth-secret",
      ZID_MANAGER_TOKEN: "manager-secret",
      ZID_STORE_ID: "store-secret",
      ZID_API_BASE_URL: "https://api.zid.sa/v1",
    };
    let observedStoreId = "";
    const result = await checkZidReadiness(env, async (config) => {
      observedStoreId = config.storeId;
      return { results: [] };
    });

    expect(observedStoreId).toBe("store-secret");
    expect(result).toEqual({ configured: true, authorized: true, status: "ready" });
    expect(JSON.stringify(result)).not.toContain("auth-secret");
    expect(JSON.stringify(result)).not.toContain("manager-secret");
    expect(JSON.stringify(result)).not.toContain("store-secret");
  });

  it("reports authorization failure without returning upstream error bodies", async () => {
    const env = {
      ZID_AUTHORIZATION_TOKEN: "Bearer auth-secret",
      ZID_MANAGER_TOKEN: "manager-secret",
      ZID_STORE_ID: "store-secret",
    };
    const result = await checkZidReadiness(env, async () => {
      throw new Error("401 token=manager-secret");
    });
    expect(result).toEqual({ configured: true, authorized: false, status: "authorization_failed" });
    expect(JSON.stringify(result)).not.toContain("manager-secret");
  });
});