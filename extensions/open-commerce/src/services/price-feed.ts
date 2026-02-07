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
