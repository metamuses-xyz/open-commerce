/**
 * Confirmation validation guardrails for Open Commerce.
 * Ensures explicit user consent before order placement.
 */

/**
 * Keywords that indicate positive confirmation
 */
export const CONFIRM_KEYWORDS = [
  "yes",
  "confirm",
  "proceed",
  "place order",
  "buy",
  "purchase",
  "go ahead",
  "do it",
  "place it",
  "order it",
  "i confirm",
  "confirmed",
  "approve",
  "approved",
  "ok",
  "okay",
  "sure",
  "absolutely",
  "definitely",
  "let's do it",
  "lets do it",
  "make it happen",
  "submit",
  "submit order",
  "complete order",
  "finalize",
];

/**
 * Keywords that indicate rejection or cancellation
 */
export const REJECT_KEYWORDS = [
  "no",
  "cancel",
  "stop",
  "wait",
  "hold",
  "nevermind",
  "never mind",
  "don't",
  "dont",
  "not yet",
  "change",
  "modify",
  "abort",
  "forget it",
  "forget about it",
  "nope",
  "nah",
  "negative",
  "decline",
  "reject",
  "back",
  "go back",
  "cancel order",
  "stop order",
  "i changed my mind",
];

/**
 * Keywords that indicate uncertainty requiring clarification
 */
export const AMBIGUOUS_KEYWORDS = [
  "maybe",
  "i think",
  "probably",
  "let me think",
  "not sure",
  "i'm not sure",
  "im not sure",
  "i guess",
  "perhaps",
  "possibly",
  "might",
  "could",
  "hmm",
  "hm",
  "uh",
  "um",
  "idk",
  "i don't know",
  "i dont know",
  "give me a moment",
  "hold on",
  "wait a sec",
  "thinking",
];

export type ConfirmationResult = {
  type: "confirmed" | "rejected" | "ambiguous" | "unknown";
  matchedKeyword?: string;
  confidence: number; // 0-1
};

/**
 * Normalize text for keyword matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[!?.,']/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Check if text contains any keyword from the list
 */
function matchesKeywords(text: string, keywords: string[]): { matched: boolean; keyword?: string } {
  const normalized = normalizeText(text);

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);

    // Exact match or word boundary match
    if (normalized === normalizedKeyword) {
      return { matched: true, keyword };
    }

    // Check if keyword appears as a complete word/phrase
    const regex = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, "i");
    if (regex.test(normalized)) {
      return { matched: true, keyword };
    }
  }

  return { matched: false };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate user confirmation response
 */
export function validateConfirmation(userResponse: string): ConfirmationResult {
  const normalized = normalizeText(userResponse);

  // Short responses get higher confidence
  const isShortResponse = normalized.length < 20;

  // Check for confirmation
  const confirmMatch = matchesKeywords(userResponse, CONFIRM_KEYWORDS);
  if (confirmMatch.matched) {
    // Higher confidence for short, direct confirmations
    const confidence = isShortResponse ? 0.95 : 0.85;
    return {
      type: "confirmed",
      matchedKeyword: confirmMatch.keyword,
      confidence,
    };
  }

  // Check for rejection
  const rejectMatch = matchesKeywords(userResponse, REJECT_KEYWORDS);
  if (rejectMatch.matched) {
    const confidence = isShortResponse ? 0.95 : 0.85;
    return {
      type: "rejected",
      matchedKeyword: rejectMatch.keyword,
      confidence,
    };
  }

  // Check for ambiguous responses
  const ambiguousMatch = matchesKeywords(userResponse, AMBIGUOUS_KEYWORDS);
  if (ambiguousMatch.matched) {
    return {
      type: "ambiguous",
      matchedKeyword: ambiguousMatch.keyword,
      confidence: 0.7,
    };
  }

  // Unknown - requires clarification
  return {
    type: "unknown",
    confidence: 0.3,
  };
}

/**
 * Check if an order can be placed based on session state
 */
export type OrderValidation = {
  canPlace: boolean;
  errors: string[];
  warnings: string[];
};

export function validateOrderPlacement(params: {
  hasPreview: boolean;
  previewValid: boolean;
  confirmationReceived: boolean;
  walletConnected: boolean;
  sufficientBalance: boolean;
  totalUsd: number;
}): OrderValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required checks
  if (!params.hasPreview) {
    errors.push("Order preview is required before placing an order. Use action='preview' first.");
  }

  if (params.hasPreview && !params.previewValid) {
    errors.push("Order preview has expired. Please create a new preview.");
  }

  if (!params.confirmationReceived) {
    errors.push("User confirmation is required. Please ask the user to confirm the order.");
  }

  // Warning checks (don't block but notify)
  if (!params.walletConnected) {
    warnings.push(
      "Wallet not connected. User should connect their Solana wallet for real transactions.",
    );
  }

  if (!params.sufficientBalance) {
    warnings.push("Insufficient USDC balance in wallet.");
  }

  // Spending limit warnings
  if (params.totalUsd > 100) {
    warnings.push(`Large order notice: This order is over $100 (${params.totalUsd.toFixed(2)}).`);
  }

  if (params.totalUsd > 500) {
    warnings.push(
      `High value order: Please ensure the user has explicitly confirmed the $${params.totalUsd.toFixed(2)} purchase.`,
    );
  }

  return {
    canPlace: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate spending limit warning message
 */
export function getSpendingLimitWarning(totalUsd: number): string | null {
  if (totalUsd > 500) {
    return `🚨 **High Value Order**: This order totals $${totalUsd.toFixed(2)}. Please type "I confirm the $${totalUsd.toFixed(2)} purchase" to proceed.`;
  }

  if (totalUsd > 100) {
    return `⚠️ **Large Order Notice**: This order is over $100 ($${totalUsd.toFixed(2)} total). Please confirm you want to proceed with this purchase.`;
  }

  return null;
}

/**
 * Validate high-value order confirmation
 * For orders over $500, require explicit amount acknowledgment
 */
export function validateHighValueConfirmation(userResponse: string, totalUsd: number): boolean {
  if (totalUsd <= 500) {
    // Standard confirmation is sufficient for orders under $500
    const result = validateConfirmation(userResponse);
    return result.type === "confirmed";
  }

  // For orders over $500, check if user mentioned the amount
  const normalized = normalizeText(userResponse);
  const amountStr = totalUsd.toFixed(2);
  const roundedAmount = Math.round(totalUsd).toString();

  // Check if user mentioned the amount (exactly or rounded)
  const mentionsAmount =
    normalized.includes(amountStr) ||
    normalized.includes(roundedAmount) ||
    normalized.includes(`$${amountStr}`) ||
    normalized.includes(`$${roundedAmount}`);

  // Must also have a confirmation keyword
  const result = validateConfirmation(userResponse);

  return result.type === "confirmed" && mentionsAmount;
}
