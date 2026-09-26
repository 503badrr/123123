import { describe, expect, it } from "vitest";
import { formatTapAmount, mapTapStatus, tapSourceId } from "./tap.logic";

describe("Tap payment rules", () => {
  it("maps mada to the Saudi mada source for SAR", () => {
    expect(tapSourceId("mada", "SAR")).toBe("src_sa.mada");
  });

  it("rejects mada outside SAR", () => {
    expect(() => tapSourceId("mada", "USD")).toThrow(/SAR/i);
  });

  it("maps Visa and Mastercard to card hosted source", () => {
    expect(tapSourceId("visa", "SAR")).toBe("src_card");
    expect(tapSourceId("mastercard", "SAR")).toBe("src_card");
  });

  it("maps explicit Apple Pay to src_apple_pay", () => {
    expect(tapSourceId("apple-pay", "SAR")).toBe("src_apple_pay");
  });

  it("honors an explicit controlled source override", () => {
    expect(tapSourceId("apple-pay", "SAR", "src_all")).toBe("src_all");
  });

  it("normalizes recoverable Tap states to pending", () => {
    expect(mapTapStatus("INITIATED")).toBe("pending");
    expect(mapTapStatus("IN_PROGRESS")).toBe("pending");
    expect(mapTapStatus("PENDING")).toBe("pending");
  });

  it("normalizes captured, authorized, refunded and terminal failures", () => {
    expect(mapTapStatus("CAPTURED")).toBe("captured");
    expect(mapTapStatus("AUTHORIZED")).toBe("authorized");
    expect(mapTapStatus("REFUNDED")).toBe("refunded");
    expect(mapTapStatus("DECLINED")).toBe("failed");
    expect(mapTapStatus("TIMEDOUT")).toBe("failed");
    expect(mapTapStatus("RESTRICTED")).toBe("failed");
  });

  it("uses three decimals for currencies that require them", () => {
    expect(formatTapAmount(1.2, "KWD")).toBe("1.200");
    expect(formatTapAmount(1.2, "BHD")).toBe("1.200");
  });

  it("uses two decimals for SAR", () => {
    expect(formatTapAmount(10, "SAR")).toBe("10.00");
  });
});
