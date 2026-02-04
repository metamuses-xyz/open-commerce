/**
 * Amazon order tool for order preview and placement.
 * Uses USDC for stable, predictable payments.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "../../../../src/plugins/types.js";
import { getProductByAsin } from "../data/products.js";
import { getPriceQuote } from "../services/price-feed.js";

type OrderState = {
  orderId: string;
  asin: string;
  product: string;
  quantity: number;
  priceUsd: number;
  priceUsdc: number;
  status: "preview" | "pending_payment" | "confirmed" | "shipped";
  shippingAddress?: ShippingAddress;
  paymentTxSignature?: string;
  createdAt: string;
  estimatedDelivery?: string;
};

type ShippingAddress = {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

// In-memory order store (for demo purposes)
const orders = new Map<string, OrderState>();

function generateOrderId(): string {
  const prefix = "114";
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}-${random}-${Date.now().toString(36).toUpperCase()}`;
}

function getEstimatedDelivery(): string {
  const now = new Date();
  const minDays = 2;
  const maxDays = 5;
  const deliveryDays = minDays + Math.floor(Math.random() * (maxDays - minDays + 1));
  const deliveryDate = new Date(now.getTime() + deliveryDays * 24 * 60 * 60 * 1000);
  return deliveryDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function createAmazonOrderTool(_api: OpenClawPluginApi) {
  return {
    name: "amazon_order",
    description:
      'Preview or place an Amazon order with USDC payment. IMPORTANT: Always use "preview" action first and require explicit user confirmation ("yes"/"confirm") before using "place" action.',
    parameters: Type.Object({
      action: Type.Unsafe<"preview" | "place">({
        type: "string",
        enum: ["preview", "place"],
        description:
          'Action to perform: "preview" shows order details before purchase, "place" confirms the order (requires prior user confirmation)',
      }),
      asin: Type.String({
        description: "Amazon Standard Identification Number (ASIN) of the product",
      }),
      quantity: Type.Optional(
        Type.Number({
          description: "Quantity to order (default: 1)",
          minimum: 1,
          maximum: 10,
        }),
      ),
      shippingAddress: Type.Optional(
        Type.Object(
          {
            name: Type.String(),
            street: Type.String(),
            city: Type.String(),
            state: Type.String(),
            zip: Type.String(),
            country: Type.Optional(Type.String()),
          },
          { description: "Shipping address for the order" },
        ),
      ),
      paymentTxSignature: Type.Optional(
        Type.String({
          description:
            'Solana transaction signature for USDC payment (required for "place" action)',
        }),
      ),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const action = typeof params.action === "string" ? params.action : "";
      const asin = typeof params.asin === "string" ? params.asin.trim() : "";
      const quantity = typeof params.quantity === "number" ? params.quantity : 1;

      if (!asin) {
        throw new Error("ASIN is required");
      }

      const product = await getProductByAsin(asin);
      if (!product) {
        throw new Error(`Product not found: ${asin}. Use amazon_search to find valid products.`);
      }

      switch (action) {
        case "preview":
          return handlePreview(product, quantity, params);
        case "place":
          return handlePlace(product, quantity, params);
        default:
          throw new Error(`Unknown action: ${action}. Valid actions: preview, place`);
      }
    },
  };
}

async function handlePreview(
  product: ReturnType<typeof getProductByAsin> & object,
  quantity: number,
  params: Record<string, unknown>,
) {
  const totalUsd = product.price * quantity;
  const quote = await getPriceQuote(totalUsd);

  // Parse shipping address if provided
  let shippingAddress: ShippingAddress | undefined;
  if (params.shippingAddress && typeof params.shippingAddress === "object") {
    const addr = params.shippingAddress as Record<string, string>;
    shippingAddress = {
      name: addr.name || "",
      street: addr.street || "",
      city: addr.city || "",
      state: addr.state || "",
      zip: addr.zip || "",
      country: addr.country || "US",
    };
  }

  const orderId = generateOrderId();
  const estimatedDelivery = getEstimatedDelivery();

  // Store preview order
  const order: OrderState = {
    orderId,
    asin: product.asin,
    product: product.title,
    quantity,
    priceUsd: totalUsd,
    priceUsdc: quote.usdcAmount,
    status: "preview",
    shippingAddress,
    createdAt: new Date().toISOString(),
    estimatedDelivery,
  };
  orders.set(orderId, order);

  const lines = [
    `**Order Preview**`,
    "",
    `📦 **Product:** ${product.title}`,
    `   Brand: ${product.brand}`,
    `   ASIN: ${product.asin}`,
    `   Quantity: ${quantity}`,
    "",
    `💰 **Price:**`,
    `   Subtotal: $${product.price.toFixed(2)} × ${quantity} = $${totalUsd.toFixed(2)}`,
    `   Payment: ${quote.usdcAmount.toFixed(2)} USDC`,
    `   _(USDC is a stablecoin: 1 USDC = $1 USD)_`,
    "",
  ];

  if (shippingAddress) {
    lines.push(`📍 **Ship to:**`);
    lines.push(`   ${shippingAddress.name}`);
    lines.push(`   ${shippingAddress.street}`);
    lines.push(`   ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`);
    lines.push(`   ${shippingAddress.country}`);
    lines.push("");
  } else {
    lines.push(`📍 **Shipping:** Please provide a shipping address to proceed.`);
    lines.push("");
  }

  lines.push(`🚚 **Estimated Delivery:** ${estimatedDelivery}`);
  lines.push("");
  lines.push(`⏰ **Quote valid for:** 30 minutes`);
  lines.push("");
  lines.push(`---`);
  lines.push(`**To place this order, type "yes" or "confirm".**`);
  lines.push(
    `_Your wallet will be prompted to sign a ${quote.usdcAmount.toFixed(2)} USDC transaction._`,
  );

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    details: {
      action: "preview",
      orderId,
      product: {
        asin: product.asin,
        title: product.title,
        brand: product.brand,
        price: product.price,
      },
      quantity,
      pricing: {
        subtotal: totalUsd,
        usdc: quote.usdcAmount,
        quoteExpiresAt: quote.expiresAt,
      },
      shippingAddress,
      estimatedDelivery,
    },
  };
}

async function handlePlace(
  product: ReturnType<typeof getProductByAsin> & object,
  quantity: number,
  params: Record<string, unknown>,
) {
  const paymentTxSignature =
    typeof params.paymentTxSignature === "string" ? params.paymentTxSignature.trim() : "";

  // For demo purposes, we simulate order placement without requiring actual payment
  // In production, you would verify the USDC transaction on-chain

  const totalUsd = product.price * quantity;
  const quote = await getPriceQuote(totalUsd);

  // Parse shipping address
  let shippingAddress: ShippingAddress;
  if (params.shippingAddress && typeof params.shippingAddress === "object") {
    const addr = params.shippingAddress as Record<string, string>;
    shippingAddress = {
      name: addr.name || "Demo User",
      street: addr.street || "123 Demo Street",
      city: addr.city || "San Francisco",
      state: addr.state || "CA",
      zip: addr.zip || "94102",
      country: addr.country || "US",
    };
  } else {
    // Default demo address
    shippingAddress = {
      name: "Demo User",
      street: "123 Demo Street",
      city: "San Francisco",
      state: "CA",
      zip: "94102",
      country: "US",
    };
  }

  const orderId = generateOrderId();
  const estimatedDelivery = getEstimatedDelivery();

  // Create confirmed order
  const order: OrderState = {
    orderId,
    asin: product.asin,
    product: product.title,
    quantity,
    priceUsd: totalUsd,
    priceUsdc: quote.usdcAmount,
    status: "confirmed",
    shippingAddress,
    paymentTxSignature: paymentTxSignature || `DEMO_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    estimatedDelivery,
  };
  orders.set(orderId, order);

  // Simulate Solana transaction signature if not provided
  const txSignature =
    paymentTxSignature ||
    `${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`.substring(0, 64);

  const lines = [
    `✅ **Order Confirmed!**`,
    "",
    `📋 **Order ID:** ${orderId}`,
    "",
    `📦 **Product:** ${product.title}`,
    `   Quantity: ${quantity}`,
    `   Total: $${totalUsd.toFixed(2)} (${quote.usdcAmount.toFixed(2)} USDC)`,
    "",
    `📍 **Shipping to:**`,
    `   ${shippingAddress.name}`,
    `   ${shippingAddress.street}`,
    `   ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`,
    "",
    `🚚 **Estimated Delivery:** ${estimatedDelivery}`,
    "",
    `💳 **Payment:**`,
    `   Currency: USDC (Solana)`,
    `   TX: ${txSignature.substring(0, 20)}...`,
    `   Status: Confirmed`,
    "",
    `---`,
    `_Thank you for your order! You'll receive tracking information once your package ships._`,
    "",
    `⚠️ _This is a demo transaction. No real order was placed or payment processed._`,
  ];

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    details: {
      action: "place",
      orderId,
      status: "confirmed",
      product: {
        asin: product.asin,
        title: product.title,
        brand: product.brand,
      },
      quantity,
      pricing: {
        total: totalUsd,
        usdc: quote.usdcAmount,
      },
      shippingAddress,
      payment: {
        currency: "USDC",
        txSignature,
        status: "confirmed",
      },
      estimatedDelivery,
      isDemo: true,
    },
  };
}
