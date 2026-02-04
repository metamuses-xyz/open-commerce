/**
 * Open Commerce Extension
 *
 * AI-powered shopping agent that enables purchasing Amazon products
 * with Solana (SOL/USDC) payments.
 */

import type { OpenClawPluginApi } from "../../src/plugins/types.js";
import { createAmazonOrderTool } from "./src/tools/amazon-order.js";
import { createAmazonSearchTool } from "./src/tools/amazon-search.js";
import { createPriceQuoteTool } from "./src/tools/price-quote.js";
import { createSolanaWalletTool } from "./src/tools/solana-wallet.js";

export default function register(api: OpenClawPluginApi) {
  // Register amazon_search tool
  api.registerTool(
    (ctx) => {
      // Available in all contexts
      if (ctx.sandboxed) {
        return null;
      }
      return createAmazonSearchTool(api);
    },
    { optional: true },
  );

  // Register price_quote tool
  api.registerTool(
    (ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createPriceQuoteTool(api);
    },
    { optional: true },
  );

  // Register solana_wallet tool
  api.registerTool(
    (ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createSolanaWalletTool(api);
    },
    { optional: true },
  );

  // Register amazon_order tool
  api.registerTool(
    (ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createAmazonOrderTool(api);
    },
    { optional: true },
  );

  api.logger.info("Open Commerce extension loaded - Solana shopping tools registered");
}
