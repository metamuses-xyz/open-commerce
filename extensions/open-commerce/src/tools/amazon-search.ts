/**
 * Amazon product search tool.
 * Searches the mock product catalog and returns matching products with USDC prices.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../../src/plugins/types.js";
import { searchProducts } from "../data/products.js";

export function createAmazonSearchTool(_api: OpenClawPluginApi) {
  return {
    name: "amazon_search",
    description:
      "Search for products on Amazon. Returns product listings with prices in USD and USDC (1:1 stablecoin).",
    parameters: Type.Object({
      query: Type.String({
        description: "Search query (e.g., 'wireless earbuds', 'usb-c cable')",
      }),
      maxResults: Type.Optional(
        Type.Number({
          description: "Maximum number of results to return (default: 5, max: 10)",
          minimum: 1,
          maximum: 10,
        }),
      ),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const query = typeof params.query === "string" ? params.query.trim() : "";
      if (!query) {
        throw new Error("Search query is required");
      }

      const maxResults = typeof params.maxResults === "number" ? params.maxResults : 5;

      // Search products
      const products = searchProducts(query, maxResults);

      if (products.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No products found for "${query}". Try a different search term.`,
            },
          ],
        };
      }

      // Format results with USDC pricing (1:1 with USD)
      const results = products.map((p) => ({
        asin: p.asin,
        title: p.title,
        brand: p.brand,
        price: {
          usd: p.price,
          usdc: p.price, // 1:1 with USD
        },
        rating: p.rating,
        reviewCount: p.reviewCount,
        prime: p.prime,
        imageUrl: p.imageUrl,
      }));

      // Build text response
      const lines = [
        `Found ${results.length} product${results.length > 1 ? "s" : ""} for "${query}":`,
        "",
      ];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        lines.push(`${i + 1}. **${r.title}**`);
        lines.push(`   - ASIN: ${r.asin}`);
        lines.push(`   - Price: $${r.price.usd.toFixed(2)} (${r.price.usdc.toFixed(2)} USDC)`);
        lines.push(`   - Rating: ${r.rating}/5 (${r.reviewCount.toLocaleString()} reviews)`);
        if (r.prime) {
          lines.push(`   - Prime eligible`);
        }
        lines.push("");
      }

      lines.push(`_All prices shown in USDC (stablecoin, 1 USDC = $1 USD)_`);

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          query,
          count: results.length,
          products: results,
        },
      };
    },
  };
}
