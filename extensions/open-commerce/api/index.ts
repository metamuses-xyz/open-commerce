/**
 * Open Commerce API - Vercel Serverless Handler
 *
 * Deploy with: vercel deploy
 */

import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";
import { searchProducts, getProductByAsin, getAllProducts } from "../src/data/products.js";

// USDC Configuration
const USDC_MINT = {
  devnet: new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"),
  "mainnet-beta": new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
};
const USDC_DECIMALS = 6;
const NETWORK = "devnet";

// In-memory order store (note: resets on cold start)
const orders = new Map<string, Record<string, unknown>>();

// Create Hono app
const app = new Hono().basePath("/api");

// Enable CORS for agent access
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// API info
app.get("/", (c) => {
  return c.json({
    name: "Open Commerce API",
    version: "1.0.0",
    description: "AI-powered shopping with USDC on Solana",
    network: NETWORK,
    usdcMint: USDC_MINT.devnet.toString(),
    endpoints: {
      search: "POST /api/search",
      quote: "POST /api/quote",
      order: "POST /api/order",
      orderStatus: "GET /api/order/:orderId",
      pay: "POST /api/pay",
      verify: "GET /api/verify/:signature",
    },
    agentIntegration: {
      description: "Other agents can interact with this API using standard HTTP requests",
      example: 'curl -X POST /api/search -d \'{"query": "earbuds"}\'',
    },
  });
});

// Search products
app.post("/search", async (c) => {
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

// Get USDC quote
app.post("/quote", async (c) => {
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

// Create order preview
app.post("/order", async (c) => {
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

  const order = {
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
      network: "Solana Devnet",
      mint: USDC_MINT.devnet.toString(),
    },
    nextStep: "Use POST /api/pay to execute USDC payment",
  });
});

// Get order status
app.get("/order/:orderId", (c) => {
  const orderId = c.req.param("orderId");
  const order = orders.get(orderId);

  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  return c.json(order);
});

// Payment endpoint - returns transaction template for agents
app.post("/pay", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const to = typeof body.to === "string" ? body.to : "";
  const amount = typeof body.amount === "number" ? body.amount : 0;
  const memo = typeof body.memo === "string" ? body.memo : "";

  if (!to) {
    return c.json(
      {
        error: "Recipient address (to) is required",
        example: { to: "WALLET_ADDRESS", amount: 10.0, memo: "Payment for service" },
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

  const usdcMint = USDC_MINT.devnet;
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
      "3. Sign and send to Solana devnet",
      "4. Verify with GET /api/verify/:signature",
    ],
  });
});

// Verify transaction on-chain
app.get("/verify/:signature", async (c) => {
  const signature = c.req.param("signature");

  if (!signature || signature.length < 32) {
    return c.json({ error: "Invalid transaction signature" }, 400);
  }

  try {
    const connection = new Connection(clusterApiUrl(NETWORK), "confirmed");
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

    const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null;

    return c.json({
      verified: true,
      signature,
      status: tx.meta?.err ? "failed" : "confirmed",
      slot: tx.slot,
      blockTime,
      fee: tx.meta?.fee,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
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

// Export for Vercel
export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);

export default app;
