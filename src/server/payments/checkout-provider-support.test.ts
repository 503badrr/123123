import { afterEach, describe, expect, it } from "vitest";

import * as providerModule from "./provider.server";

describe("hosted checkout provider support", () => {
  afterEach(() => {
    delete process.env.PAYMENT_PROVIDER;
  });

  it("allows Moyasar hosted checkout", () => {
    const supports = (providerModule as typeof providerModule & {
      isHostedCheckoutProviderSupported?: (name: string) => boolean;
    }).isHostedCheckoutProviderSupported;

    expect(supports?.("moyasar")).toBe(true);
  });

  it("defaults checkout provider selection to Moyasar", () => {
    delete process.env.PAYMENT_PROVIDER;

    expect(providerModule.getActiveProviderName()).toBe("moyasar");
  });
});
