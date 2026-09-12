import { describe, expect, it } from "vitest";
import { netPrice } from "./format";
describe("Bill preview rounding", () => {
  it("matches server per-unit percentage rounding", () =>
    expect(netPrice(1999, "percent", 15)).toBe(1699));
  it("applies fixed rupee discounts to each unit", () =>
    expect(netPrice(50000, "fixed", 50) * 3).toBe(135000));
  it("supports zero-price items after a full discount", () =>
    expect(netPrice(10000, "percent", 100)).toBe(0));
});
