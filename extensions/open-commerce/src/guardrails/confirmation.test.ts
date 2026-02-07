import { describe, expect, it } from "vitest";
import {
  validateConfirmation,
  getSpendingLimitWarning,
  validateHighValueConfirmation,
  validateOrderPlacement,
} from "./confirmation.js";

describe("validateConfirmation", () => {
  it("recognizes positive confirmations", () => {
    const cases = ["yes", "confirm", "proceed", "buy", "ok", "sure", "absolutely"];
    for (const input of cases) {
      const result = validateConfirmation(input);
      expect(result.type).toBe("confirmed");
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    }
  });

  it("recognizes rejections", () => {
    const cases = ["no", "cancel", "stop", "abort", "nope", "decline"];
    for (const input of cases) {
      const result = validateConfirmation(input);
      expect(result.type).toBe("rejected");
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    }
  });

  it("recognizes ambiguous responses", () => {
    const cases = ["maybe", "let me think", "hmm", "idk"];
    for (const input of cases) {
      const result = validateConfirmation(input);
      expect(result.type).toBe("ambiguous");
      expect(result.confidence).toBe(0.7);
    }
  });

  it("returns unknown for unrecognized input", () => {
    const result = validateConfirmation("the weather is nice today");
    expect(result.type).toBe("unknown");
    expect(result.confidence).toBe(0.3);
  });

  it("handles case-insensitive matching", () => {
    expect(validateConfirmation("YES").type).toBe("confirmed");
    expect(validateConfirmation("CANCEL").type).toBe("rejected");
    expect(validateConfirmation("Maybe").type).toBe("ambiguous");
  });

  it("handles punctuation in input", () => {
    expect(validateConfirmation("yes!").type).toBe("confirmed");
    expect(validateConfirmation("no.").type).toBe("rejected");
  });

  it("gives higher confidence for short responses", () => {
    const shortResult = validateConfirmation("yes");
    const longResult = validateConfirmation("yes I would like to proceed with the order please");
    expect(shortResult.confidence).toBeGreaterThan(longResult.confidence);
  });
});

describe("getSpendingLimitWarning", () => {
  it("returns null for orders under $100", () => {
    expect(getSpendingLimitWarning(50)).toBeNull();
    expect(getSpendingLimitWarning(99.99)).toBeNull();
  });

  it("returns warning for orders over $100", () => {
    const warning = getSpendingLimitWarning(150);
    expect(warning).toContain("Large Order Notice");
    expect(warning).toContain("150.00");
  });

  it("returns high-value warning for orders over $500", () => {
    const warning = getSpendingLimitWarning(750);
    expect(warning).toContain("High Value Order");
    expect(warning).toContain("750.00");
  });
});

describe("validateHighValueConfirmation", () => {
  it("allows standard confirmation for orders under $500", () => {
    expect(validateHighValueConfirmation("yes", 100)).toBe(true);
  });

  it("requires amount mention for orders over $500", () => {
    expect(validateHighValueConfirmation("yes", 600)).toBe(false);
    expect(validateHighValueConfirmation("I confirm the $600.00 purchase", 600)).toBe(true);
    expect(validateHighValueConfirmation("I confirm the $600 purchase", 600)).toBe(true);
  });
});

describe("validateOrderPlacement", () => {
  it("returns errors when prerequisites are missing", () => {
    const result = validateOrderPlacement({
      hasPreview: false,
      previewValid: false,
      confirmationReceived: false,
      walletConnected: false,
      sufficientBalance: false,
      totalUsd: 50,
    });
    expect(result.canPlace).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("allows placement when all prerequisites are met", () => {
    const result = validateOrderPlacement({
      hasPreview: true,
      previewValid: true,
      confirmationReceived: true,
      walletConnected: true,
      sufficientBalance: true,
      totalUsd: 50,
    });
    expect(result.canPlace).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("adds warnings for large orders", () => {
    const result = validateOrderPlacement({
      hasPreview: true,
      previewValid: true,
      confirmationReceived: true,
      walletConnected: true,
      sufficientBalance: true,
      totalUsd: 150,
    });
    expect(result.canPlace).toBe(true);
    expect(result.warnings.some((w) => w.includes("over $100"))).toBe(true);
  });

  it("adds extra warning for high-value orders", () => {
    const result = validateOrderPlacement({
      hasPreview: true,
      previewValid: true,
      confirmationReceived: true,
      walletConnected: true,
      sufficientBalance: true,
      totalUsd: 600,
    });
    expect(result.warnings.some((w) => w.includes("High value"))).toBe(true);
  });
});
