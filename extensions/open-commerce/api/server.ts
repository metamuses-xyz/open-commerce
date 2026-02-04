/**
 * Open Commerce REST API Server
 *
 * Provides REST endpoints for other agents to interact with:
 * - POST /api/search - Search products
 * - POST /api/quote - Get USDC price quote
 * - POST /api/order - Create order preview
 * - POST /api/pay - Execute USDC payment
 * - GET /api/verify/:signature - Verify transaction
 */

import { serve } from "@hono/node-server";
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
  Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Hono } from "hono";
import { cors } from "hono/cors";

// USDC Configuration
const USDC_MINT = {
  devnet: new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"),
  "mainnet-beta": new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
};
const USDC_DECIMALS = 6;
const NETWORK: "devnet" | "mainnet-beta" = "devnet";

// Shared connection instance
const connection = new Connection(clusterApiUrl(NETWORK), "confirmed");

// Mock product catalog
const PRODUCTS = [
  {
    asin: "B0BDHWDR12",
    title: "Apple AirPods Pro (2nd Generation)",
    brand: "Apple",
    price: 199.99,
    rating: 4.7,
    reviewCount: 89234,
    prime: true,
    imageUrl: "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg",
  },
  {
    asin: "B09JQL3NWT",
    title: "Samsung Galaxy Buds2 Pro",
    brand: "Samsung",
    price: 149.99,
    rating: 4.5,
    reviewCount: 12456,
    prime: true,
    imageUrl: "https://m.media-amazon.com/images/I/51qlzPL-Y7L._AC_SL1500_.jpg",
  },
  {
    asin: "B08T5QN6S3",
    title: "Anker Soundcore Liberty 4 NC Wireless Earbuds",
    brand: "Anker",
    price: 79.99,
    rating: 4.4,
    reviewCount: 8901,
    prime: true,
    imageUrl: "https://m.media-amazon.com/images/I/51EWblkTm7L._AC_SL1500_.jpg",
  },
  {
    asin: "B0BXZ6Y5WQ",
    title: "USB C Cable 3-Pack 6ft Fast Charging",
    brand: "Anker",
    price: 19.99,
    rating: 4.6,
    reviewCount: 45678,
    prime: true,
    imageUrl: "https://m.media-amazon.com/images/I/61bT+fJJJAL._AC_SL1500_.jpg",
  },
  {
    asin: "B09V3KXJPB",
    title: "Logitech MX Master 3S Wireless Mouse",
    brand: "Logitech",
    price: 99.99,
    rating: 4.8,
    reviewCount: 23456,
    prime: true,
    imageUrl: "https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg",
  },
];

// In-memory order store
const orders = new Map<
  string,
  {
    orderId: string;
    asin: string;
    product: string;
    quantity: number;
    priceUsd: number;
    priceUsdc: number;
    status: string;
    createdAt: string;
    txSignature?: string;
  }
>();

// Create Hono app
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

// Health check
app.get("/", (c) => {
  return c.json({
    name: "Open Commerce API",
    version: "1.0.0",
    description: "AI-powered shopping with USDC on Solana",
    network: NETWORK,
    endpoints: {
      search: "POST /api/search",
      quote: "POST /api/quote",
      order: "POST /api/order",
      pay: "POST /api/pay",
      verify: "GET /api/verify/:signature",
    },
  });
});

// Search products
app.post("/api/search", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query.toLowerCase() : "";
  const maxResults = typeof body.maxResults === "number" ? Math.min(body.maxResults, 10) : 5;

  if (!query) {
    return c.json({ error: "Query is required" }, 400);
  }

  const results = PRODUCTS.filter(
    (p) =>
      p.title.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.asin.toLowerCase().includes(query),
  )
    .slice(0, maxResults)
    .map((p) => ({
      ...p,
      priceUsdc: p.price, // 1:1 with USD
    }));

  return c.json({
    query,
    count: results.length,
    products: results,
    note: "Prices in USDC (1 USDC = $1 USD)",
  });
});

// Get USDC quote
app.post("/api/quote", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const usdAmount = typeof body.usdAmount === "number" ? body.usdAmount : 0;

  if (usdAmount <= 0) {
    return c.json({ error: "usdAmount must be positive" }, 400);
  }

  return c.json({
    usdAmount,
    usdcAmount: usdAmount, // 1:1 stablecoin
    rate: 1.0,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    note: "USDC is a stablecoin: 1 USDC = $1 USD",
  });
});

// Create order preview
app.post("/api/order", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const asin = typeof body.asin === "string" ? body.asin : "";
  const quantity = typeof body.quantity === "number" ? body.quantity : 1;

  if (!asin) {
    return c.json({ error: "ASIN is required" }, 400);
  }

  const product = PRODUCTS.find((p) => p.asin === asin);
  if (!product) {
    return c.json({ error: `Product not found: ${asin}` }, 404);
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
    paymentInstructions: {
      amount: totalUsd,
      currency: "USDC",
      network: "Solana (devnet)",
      mint: USDC_MINT.devnet.toString(),
      note: "Use POST /api/pay to execute payment",
    },
  });
});

// Get order status
app.get("/api/order/:orderId", (c) => {
  const orderId = c.req.param("orderId");
  const order = orders.get(orderId);

  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  return c.json(order);
});

// Execute USDC payment (agent-to-agent)
app.post("/api/pay", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const to = typeof body.to === "string" ? body.to : "";
  const amount = typeof body.amount === "number" ? body.amount : 0;
  const memo = typeof body.memo === "string" ? body.memo : "";
  const privateKey = typeof body.privateKey === "string" ? body.privateKey : "";

  if (!to) {
    return c.json({ error: "Recipient address (to) is required" }, 400);
  }
  if (amount <= 0) {
    return c.json({ error: "Amount must be positive" }, 400);
  }

  // Validate addresses
  let toPubkey: PublicKey;
  try {
    toPubkey = new PublicKey(to);
  } catch {
    return c.json({ error: "Invalid recipient address" }, 400);
  }

  const usdcMint = USDC_MINT.devnet;

  // If no private key provided, return unsigned transaction template
  if (!privateKey) {
    const toAta = await getAssociatedTokenAddress(usdcMint, toPubkey);
    const rawAmount = BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));

    return c.json({
      status: "unsigned",
      transaction: {
        to: to,
        toAta: toAta.toString(),
        amount: amount,
        rawAmount: rawAmount.toString(),
        currency: "USDC",
        mint: usdcMint.toString(),
        network: NETWORK,
      },
      instructions: [
        "To execute this payment:",
        "1. Build a transaction with createTransferCheckedInstruction",
        "2. Sign with your wallet",
        "3. Submit to Solana network",
        "4. Call GET /api/verify/:signature to confirm",
      ],
      memo: memo || undefined,
    });
  }

  // If private key provided, execute transaction
  try {
    // Parse private key (JSON array of bytes)
    let fromKeypair: Keypair;
    try {
      const keyArray = JSON.parse(privateKey);
      fromKeypair = Keypair.fromSecretKey(new Uint8Array(keyArray));
    } catch {
      return c.json({ error: "Invalid private key format. Provide JSON array of bytes." }, 400);
    }

    const fromPubkey = fromKeypair.publicKey;
    const fromAta = await getAssociatedTokenAddress(usdcMint, fromPubkey);
    const toAta = await getAssociatedTokenAddress(usdcMint, toPubkey);

    // Build transaction
    const transaction = new Transaction();

    // Check if recipient ATA exists
    try {
      await getAccount(connection, toAta);
    } catch {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          toAta,
          toPubkey,
          usdcMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    // Add transfer instruction
    const rawAmount = BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));
    transaction.add(
      createTransferCheckedInstruction(
        fromAta,
        usdcMint,
        toAta,
        fromPubkey,
        rawAmount,
        USDC_DECIMALS,
      ),
    );

    // Send transaction
    const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);

    return c.json({
      status: "confirmed",
      signature,
      from: fromPubkey.toString(),
      to,
      amount,
      currency: "USDC",
      network: NETWORK,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      memo: memo || undefined,
    });
  } catch (err) {
    return c.json(
      {
        error: "Transaction failed",
        details: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});

// Verify transaction
app.get("/api/verify/:signature", async (c) => {
  const signature = c.req.param("signature");

  if (!signature || signature.length < 32) {
    return c.json({ error: "Invalid signature" }, 400);
  }

  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return c.json({
        verified: false,
        signature,
        error: "Transaction not found",
      });
    }

    return c.json({
      verified: true,
      signature,
      slot: tx.slot,
      blockTime: tx.blockTime,
      fee: tx.meta?.fee,
      status: tx.meta?.err ? "failed" : "success",
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    });
  } catch (err) {
    return c.json(
      {
        verified: false,
        signature,
        error: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});

// Start server
const port = parseInt(process.env.PORT || "3000");
console.log(`Open Commerce API starting on port ${port}...`);
console.log(`Network: ${NETWORK}`);
console.log(`USDC Mint: ${USDC_MINT.devnet.toString()}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);

export default app;
