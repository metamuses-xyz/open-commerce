/**
 * Price quote tool for USD to USDC conversion.
 * Since USDC is a stablecoin pegged 1:1 with USD, this provides stable quotes.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../../src/plugins/types.js";
import { getPriceQuote } from "../services/price-feed.js";

export function createPriceQuoteTool(_api: OpenClawPluginApi) {
  return {
    name: "price_quote",
    description:
      "Get a price quote converting USD to USDC. Returns the equivalent USDC amount (1:1 with USD since USDC is a stablecoin).",
    parameters: Type.Object({
      usdAmount: Type.Number({
        description: "Amount in USD to convert",
        minimum: 0.01,
      }),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const usdAmount = typeof params.usdAmount === "number" ? params.usdAmount : 0;
      if (usdAmount <= 0) {
        throw new Error("usdAmount must be a positive number");
      }

      const quote = await getPriceQuote(usdAmount);

      const lines = [
        `**Price Quote**`,
        "",
        `| Currency | Amount |`,
        `|----------|--------|`,
        `| USD | $${quote.usdAmount.toFixed(2)} |`,
        `| USDC | ${quote.usdcAmount.toFixed(2)} USDC |`,
        "",
        `Exchange rate: 1 USDC = $1.00 USD (stablecoin)`,
        `Quote valid until: ${quote.expiresAt}`,
        "",
        `_USDC is a fully-reserved stablecoin backed 1:1 by US dollars._`,
        `_No price volatility - your payment amount is predictable._`,
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: quote,
      };
    },
  };
}
