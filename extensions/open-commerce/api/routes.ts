/**
 * Open Commerce API - Shared Route Definitions
 *
 * Unified route definitions used by both the local dev server and Vercel serverless handler.
 */

import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { searchProducts, getProductByAsin, getAllProducts } from "../src/data/products.js";

// USDC Configuration
export const USDC_MINT = {
  devnet: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  "mainnet-beta": new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
};
export const USDC_DECIMALS = 6;
export const NETWORK: "devnet" | "mainnet-beta" = "devnet";
export const VERSION = "2.0.0";

// Shared connection instance
const connection = new Connection(clusterApiUrl(NETWORK), "confirmed");

// In-memory order store (resets on cold start for serverless)
type Order = {
  orderId: string;
  asin: string;
  product: string;
  quantity: number;
  priceUsd: number;
  priceUsdc: number;
  status: string;
  createdAt: string;
  txSignature?: string;
};
const orders = new Map<string, Order>();

/**
 * Timing middleware - adds _meta to all JSON responses
 */
const timingMiddleware = createMiddleware(async (c, next) => {
  const start = performance.now();
  await next();

  // Only modify JSON responses
  const contentType = c.res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const body = await c.res.json();
    const processingTimeMs = Math.round((performance.now() - start) * 100) / 100;

    const enriched = {
      ...body,
      _meta: {
        processingTimeMs,
        timestamp: new Date().toISOString(),
        network: NETWORK,
        version: VERSION,
      },
    };

    c.res = new Response(JSON.stringify(enriched), {
      status: c.res.status,
      headers: c.res.headers,
    });
  }
});

/**
 * Create the Hono app with all routes.
 */
export function createApp(): Hono {
  const app = new Hono();

  // Enable CORS for agent access
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Add timing middleware
  app.use("*", timingMiddleware);

  // ─── Agent Discovery ───────────────────────────────────────────────

  app.get("/.well-known/agent.json", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      schema_version: "1.0",
      name: "Open Commerce",
      description:
        "AI-powered shopping with USDC payments on Solana. Enables autonomous product discovery, ordering, and payment for AI agents.",
      url: baseUrl,
      capabilities: {
        product_search: {
          endpoint: "/api/search",
          method: "POST",
          description: "Search products by keyword",
          input: { query: "string", maxResults: "number (optional, max 10)" },
        },
        price_quote: {
          endpoint: "/api/quote",
          method: "POST",
          description: "Get USDC price quote (1:1 with USD)",
          input: { usdAmount: "number" },
        },
        order_management: {
          endpoint: "/api/order",
          method: "POST",
          description: "Create order preview",
          input: { asin: "string", quantity: "number (optional)" },
        },
        payment: {
          endpoint: "/api/pay",
          method: "POST",
          description: "Get unsigned USDC transaction template",
          input: { to: "string (Solana address)", amount: "number", memo: "string (optional)" },
        },
        transaction_verification: {
          endpoint: "/api/verify/:signature",
          method: "GET",
          description: "Verify payment on-chain",
        },
        single_call_purchase: {
          endpoint: "/api/agent/purchase",
          method: "POST",
          description:
            "Complete purchase flow in a single API call — search, select, order, and prepare payment",
          input: {
            query: "string",
            criteria: "{ maxPrice?: number, minRating?: number }",
            buyerWallet: "string (Solana address)",
          },
        },
      },
      workflow: [
        "1. Search products: POST /api/search",
        "2. Create order: POST /api/order",
        "3. Prepare payment: POST /api/pay",
        "4. Sign & submit transaction to Solana",
        "5. Verify: GET /api/verify/:signature",
        "Or use POST /api/agent/purchase for steps 1-3 in one call",
      ],
      payment: {
        currency: "USDC",
        network: "Solana",
        cluster: NETWORK,
        mint: USDC_MINT[NETWORK].toString(),
        decimals: USDC_DECIMALS,
        stablecoin: true,
        rate: "1 USDC = $1 USD",
      },
      authentication: "none",
      rate_limit: "no limit",
    });
  });

  // ─── Health / Info ─────────────────────────────────────────────────

  const healthResponse = (c: Parameters<Parameters<typeof app.get>[1]>[0]) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      name: "Open Commerce API",
      version: VERSION,
      description: "AI-powered shopping with USDC on Solana",
      network: NETWORK,
      usdcMint: USDC_MINT.devnet.toString(),
      endpoints: {
        discovery: `GET ${baseUrl}/.well-known/agent.json`,
        search: `POST ${baseUrl}/api/search`,
        quote: `POST ${baseUrl}/api/quote`,
        order: `POST ${baseUrl}/api/order`,
        orderStatus: `GET ${baseUrl}/api/order/:orderId`,
        pay: `POST ${baseUrl}/api/pay`,
        verify: `GET ${baseUrl}/api/verify/:signature`,
        agentPurchase: `POST ${baseUrl}/api/agent/purchase`,
        orderConfirm: `POST ${baseUrl}/api/order/:orderId/confirm`,
      },
    });
  };

  app.get("/", healthResponse);
  app.get("/api", healthResponse);

  // ─── Search Products ───────────────────────────────────────────────

  app.post("/api/search", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const maxResults = typeof body.maxResults === "number" ? Math.min(body.maxResults, 10) : 5;

    if (!query) {
      return c.json({ error: "Query is required", example: { query: "earbuds" } }, 400);
    }

    const products = await searchProducts(query, maxResults);
    const results = products.map((p) => ({
      asin: p.asin,
      title: p.title,
      brand: p.brand,
      price: p.price,
      rating: p.rating,
      reviewCount: p.reviewCount,
      prime: p.prime,
      imageUrl: p.imageUrl,
      priceUsdc: p.price,
    }));

    return c.json({
      query,
      count: results.length,
      products: results,
      currency: "USDC",
      note: "1 USDC = $1 USD (stablecoin)",
    });
  });

  // ─── USDC Quote ────────────────────────────────────────────────────

  app.post("/api/quote", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const usdAmount = typeof body.usdAmount === "number" ? body.usdAmount : 0;

    if (usdAmount <= 0) {
      return c.json({ error: "usdAmount must be positive", example: { usdAmount: 79.99 } }, 400);
    }

    return c.json({
      usdAmount,
      usdcAmount: usdAmount,
      rate: 1.0,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      note: "USDC is a stablecoin: 1 USDC = $1 USD. No volatility.",
    });
  });

  // ─── Create Order Preview ──────────────────────────────────────────

  app.post("/api/order", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const asin = typeof body.asin === "string" ? body.asin : "";
    const quantity = typeof body.quantity === "number" ? body.quantity : 1;

    if (!asin) {
      return c.json({ error: "ASIN is required", example: { asin: "FS-1" } }, 400);
    }

    const product = await getProductByAsin(asin);
    if (!product) {
      const allProducts = await getAllProducts();
      return c.json(
        {
          error: `Product not found: ${asin}`,
          availableProducts: allProducts.slice(0, 5).map((p) => ({ asin: p.asin, title: p.title })),
        },
        404,
      );
    }

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const totalUsd = product.price * quantity;

    const order: Order = {
      orderId,
      asin: product.asin,
      product: product.title,
      quantity,
      priceUsd: totalUsd,
      priceUsdc: totalUsd,
      status: "preview",
      createdAt: new Date().toISOString(),
    };
    orders.set(orderId, order);

    return c.json({
      ...order,
      payment: {
        amount: totalUsd,
        currency: "USDC",
        network: `Solana ${NETWORK}`,
        mint: USDC_MINT[NETWORK].toString(),
      },
      nextStep: "Use POST /api/pay to execute USDC payment",
    });
  });

  // ─── Get Order Status ──────────────────────────────────────────────

  app.get("/api/order/:orderId", (c) => {
    const orderId = c.req.param("orderId");
    const order = orders.get(orderId);

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    return c.json(order);
  });

  // ─── Confirm Order with Payment Signature ──────────────────────────

  app.post("/api/order/:orderId/confirm", async (c) => {
    const orderId = c.req.param("orderId");
    const order = orders.get(orderId);

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    if (order.status === "confirmed") {
      return c.json({ error: "Order already confirmed", order }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const signature = typeof body.signature === "string" ? body.signature : "";

    if (!signature || signature.length < 32) {
      return c.json({ error: "Valid transaction signature is required" }, 400);
    }

    // Verify on-chain
    try {
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return c.json(
          {
            error: "Transaction not found on-chain. It may still be processing.",
            suggestion: "Wait a few seconds and try again.",
          },
          404,
        );
      }

      if (tx.meta?.err) {
        return c.json(
          {
            error: "Transaction failed on-chain",
            txError: tx.meta.err,
          },
          400,
        );
      }

      // Update order
      order.status = "confirmed";
      order.txSignature = signature;
      orders.set(orderId, order);

      return c.json({
        ...order,
        verification: {
          verified: true,
          slot: tx.slot,
          blockTime: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
          explorer: `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`,
        },
      });
    } catch (err) {
      return c.json(
        {
          error: "Failed to verify transaction",
          details: err instanceof Error ? err.message : String(err),
        },
        500,
      );
    }
  });

  // ─── Payment (unsigned transaction template only) ──────────────────

  app.post("/api/pay", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const to = typeof body.to === "string" ? body.to : "";
    const amount = typeof body.amount === "number" ? body.amount : 0;
    const memo = typeof body.memo === "string" ? body.memo : "";

    if (!to) {
      return c.json(
        {
          error: "Recipient address (to) is required",
          example: { to: "WALLET_ADDRESS", amount: 10.0, memo: "Payment for order" },
        },
        400,
      );
    }
    if (amount <= 0) {
      return c.json({ error: "Amount must be positive" }, 400);
    }

    // Validate address
    let toPubkey: PublicKey;
    try {
      toPubkey = new PublicKey(to);
    } catch {
      return c.json({ error: "Invalid Solana address" }, 400);
    }

    const usdcMint = USDC_MINT[NETWORK];
    const toAta = await getAssociatedTokenAddress(usdcMint, toPubkey);
    const rawAmount = BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));

    return c.json({
      status: "ready",
      payment: {
        to,
        toAta: toAta.toString(),
        amount,
        rawAmount: rawAmount.toString(),
        currency: "USDC",
        decimals: USDC_DECIMALS,
        mint: usdcMint.toString(),
        network: NETWORK,
        memo: memo || undefined,
      },
      solanaInstructions: {
        program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        instruction: "transferChecked",
        params: {
          source: "YOUR_USDC_ATA",
          mint: usdcMint.toString(),
          destination: toAta.toString(),
          owner: "YOUR_WALLET",
          amount: rawAmount.toString(),
          decimals: USDC_DECIMALS,
        },
      },
      agentGuide: [
        "1. Connect your Solana wallet",
        "2. Build transaction with createTransferCheckedInstruction",
        "3. Sign and send to Solana " + NETWORK,
        "4. Confirm order with POST /api/order/:orderId/confirm",
      ],
    });
  });

  // ─── Verify Transaction ────────────────────────────────────────────

  app.get("/api/verify/:signature", async (c) => {
    const signature = c.req.param("signature");

    if (!signature || signature.length < 32) {
      return c.json({ error: "Invalid transaction signature" }, 400);
    }

    try {
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return c.json({
          verified: false,
          signature,
          error: "Transaction not found. It may still be processing.",
        });
      }

      return c.json({
        verified: true,
        signature,
        status: tx.meta?.err ? "failed" : "confirmed",
        slot: tx.slot,
        blockTime: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
        fee: tx.meta?.fee,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`,
      });
    } catch (err) {
      return c.json(
        {
          verified: false,
          signature,
          error: err instanceof Error ? err.message : "Verification failed",
        },
        500,
      );
    }
  });

  // ─── Single-Call Agent Purchase ────────────────────────────────────

  app.post("/api/agent/purchase", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const criteria = typeof body.criteria === "object" && body.criteria ? body.criteria : {};
    const buyerWallet = typeof body.buyerWallet === "string" ? body.buyerWallet : "";

    if (!query) {
      return c.json(
        {
          error: "Query is required",
          example: {
            query: "wireless earbuds",
            criteria: { maxPrice: 50, minRating: 4.0 },
            buyerWallet: "YOUR_SOLANA_ADDRESS",
          },
        },
        400,
      );
    }

    const maxPrice = typeof criteria.maxPrice === "number" ? criteria.maxPrice : Infinity;
    const minRating = typeof criteria.minRating === "number" ? criteria.minRating : 0;

    // Step 1: Search
    const allResults = await searchProducts(query, 10);

    // Step 2: Filter by criteria
    const filtered = allResults.filter((p) => p.price <= maxPrice && p.rating >= minRating);

    if (filtered.length === 0) {
      return c.json(
        {
          status: "no_match",
          query,
          criteria: { maxPrice: maxPrice === Infinity ? undefined : maxPrice, minRating },
          totalSearchResults: allResults.length,
          suggestion:
            allResults.length > 0
              ? "Try relaxing your criteria. Cheapest result: $" +
                Math.min(...allResults.map((p) => p.price)).toFixed(2)
              : "No products found for this query. Try different keywords.",
        },
        404,
      );
    }

    // Step 3: Select best match (highest score from search, already sorted)
    const selected = filtered[0];
    const reasoning = `Selected "${selected.title}" — best match for "${query}" at $${selected.price.toFixed(2)} with ${selected.rating}/5 rating (${selected.reviewCount} reviews)`;

    // Step 4: Create order
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const order: Order = {
      orderId,
      asin: selected.asin,
      product: selected.title,
      quantity: 1,
      priceUsd: selected.price,
      priceUsdc: selected.price,
      status: "preview",
      createdAt: new Date().toISOString(),
    };
    orders.set(orderId, order);

    // Step 5: Prepare payment template
    let paymentTemplate = null;
    if (buyerWallet) {
      try {
        new PublicKey(buyerWallet); // validate address
        const usdcMint = USDC_MINT[NETWORK];

        // Merchant wallet (would be configured in production)
        const merchantWallet = "11111111111111111111111111111111";
        const merchantPubkey = new PublicKey(merchantWallet);
        const merchantAta = await getAssociatedTokenAddress(usdcMint, merchantPubkey);

        const rawAmount = BigInt(Math.round(selected.price * Math.pow(10, USDC_DECIMALS)));

        paymentTemplate = {
          from: buyerWallet,
          to: merchantWallet,
          toAta: merchantAta.toString(),
          amount: selected.price,
          rawAmount: rawAmount.toString(),
          currency: "USDC",
          decimals: USDC_DECIMALS,
          mint: usdcMint.toString(),
          network: NETWORK,
          memo: `Open Commerce order ${orderId}`,
        };
      } catch {
        // Invalid wallet — still return order but skip payment template
      }
    }

    return c.json({
      status: "ready",
      reasoning,
      selectedProduct: {
        asin: selected.asin,
        title: selected.title,
        brand: selected.brand,
        price: selected.price,
        priceUsdc: selected.price,
        rating: selected.rating,
        reviewCount: selected.reviewCount,
        imageUrl: selected.imageUrl,
      },
      order,
      payment: paymentTemplate,
      alternativeProducts: filtered.slice(1, 4).map((p) => ({
        asin: p.asin,
        title: p.title,
        price: p.price,
        rating: p.rating,
      })),
      nextSteps: paymentTemplate
        ? [
            "1. Sign the USDC transaction with your wallet",
            "2. Submit to Solana " + NETWORK,
            `3. Confirm with POST /api/order/${orderId}/confirm { signature: "TX_SIG" }`,
          ]
        : [
            "1. Provide your Solana wallet address to get payment details",
            "2. Or use POST /api/pay with { to, amount } to get transaction template",
          ],
    });
  });

  return app;
}
