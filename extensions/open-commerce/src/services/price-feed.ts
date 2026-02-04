/**
 * Price feed service for USDC payments.
 * USDC is a stablecoin pegged 1:1 with USD, so no price conversion is needed.
 */

const QUOTE_TTL_MS = 30 * 60 * 1000; // 30 minutes (quotes are stable for USDC)

/**
 * Get full price quote for USDC payment.
 * Since USDC is pegged 1:1 with USD, this simply returns the amount.
 */
export async function getPriceQuote(usdAmount: number) {
  return {
    usdAmount,
    usdcAmount: usdAmount, // 1:1 with USD
    rate: 1.0, // USDC = USD
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  };
}

/**
 * Convert USD amount to USDC amount (1:1 conversion).
 */
export function usdToUsdc(usdAmount: number): number {
  return usdAmount;
}

// Backwards compatibility exports (deprecated, kept for migration)
export async function getSolUsdPrice(): Promise<number> {
  // This is deprecated - we only use USDC now
  // Return a placeholder value to prevent breaking code that still calls this
  console.warn("getSolUsdPrice is deprecated - Open Commerce now uses USDC only");
  return 0;
}

export async function usdToSol(_usdAmount: number): Promise<number> {
  console.warn("usdToSol is deprecated - Open Commerce now uses USDC only");
  return 0;
}

/**
 * Clear the price cache (for testing).
 * No-op for USDC since there's no volatile price to cache.
 */
export function clearPriceCache() {
  // No-op - USDC doesn't need price caching
}
