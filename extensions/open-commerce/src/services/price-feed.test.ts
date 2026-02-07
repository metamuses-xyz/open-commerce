import { describe, expect, it } from "vitest";
import { getPriceQuote, usdToUsdc } from "./price-feed.js";

describe("getPriceQuote", () => {
  it("returns 1:1 USDC quote", async () => {
    const quote = await getPriceQuote(99.99);
    expect(quote.usdAmount).toBe(99.99);
    expect(quote.usdcAmount).toBe(99.99);
    expect(quote.rate).toBe(1.0);
  });

  it("includes expiration timestamp", async () => {
    const quote = await getPriceQuote(10);
    expect(quote.expiresAt).toBeDefined();
    const expires = new Date(quote.expiresAt).getTime();
    const now = Date.now();
    // Should expire about 30 minutes from now
    expect(expires - now).toBeGreaterThan(29 * 60 * 1000);
    expect(expires - now).toBeLessThan(31 * 60 * 1000);
  });

  it("handles zero amount", async () => {
    const quote = await getPriceQuote(0);
    expect(quote.usdcAmount).toBe(0);
  });

  it("handles large amounts", async () => {
    const quote = await getPriceQuote(1_000_000);
    expect(quote.usdcAmount).toBe(1_000_000);
  });
});

describe("usdToUsdc", () => {
  it("converts 1:1", () => {
    expect(usdToUsdc(100)).toBe(100);
    expect(usdToUsdc(0.01)).toBe(0.01);
    expect(usdToUsdc(0)).toBe(0);
  });
});
