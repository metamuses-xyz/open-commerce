---
name: open-commerce
description: Buy Amazon products with USDC on Solana. Enables AI-powered shopping with stable stablecoin payments. Never place orders without explicit user confirmation. Triggers: buy, order, shop, Amazon, purchase, USDC.
homepage: https://github.com/open-commerce
metadata: {"openclaw":{"emoji":"🛒"}}
---

# Open Commerce - USDC Shopping Agent

Goal: Help users discover, compare, and purchase Amazon products using USDC stablecoin payments on Solana.

## Why USDC?

**USDC is a stablecoin**: 1 USDC = $1 USD, always.

- **No volatility** - Your payment amount is predictable
- **Fast settlement** - Solana sub-second finality
- **Low fees** - < $0.001 per transaction
- **Transparent pricing** - What you see is what you pay

## Hard Safety Rules

1. **NEVER** place orders without explicit user confirmation ("yes", "confirm", "place the order")
2. **ALWAYS** use `amazon_order action="preview"` first to show what will be ordered
3. **ALWAYS** show price in both USD and USDC before any purchase
4. **VERIFY** wallet connection before requesting transaction signatures
5. **VERIFY** sufficient USDC balance before proceeding with payment
6. **NEVER** proceed with ambiguous user responses - ask for explicit confirmation

## Available Tools

### amazon_search

Search for products on Amazon.

```
amazon_search query="wireless earbuds" maxResults=5
```

### price_quote

Get USDC price for a USD amount (1:1 conversion).

```
price_quote usdAmount=49.99
```

### solana_wallet

Manage Solana wallet connection and USDC transactions.

```
# Connect wallet
solana_wallet action="connect"

# Check connection status
solana_wallet action="status" publicKey="YOUR_PUBLIC_KEY"

# Check USDC balance
solana_wallet action="balance" publicKey="YOUR_PUBLIC_KEY"

# Create USDC transaction for signing
solana_wallet action="sign_transaction" amount=79.99 memo="Order-12345"
```

### amazon_order

Preview or place an order with USDC payment.

```
# Preview (ALWAYS do this first)
amazon_order action="preview" asin="B08T5QN6S3" quantity=1

# Place order (ONLY after explicit user confirmation)
amazon_order action="place" asin="B08T5QN6S3" quantity=1 paymentTxSignature="..."
```

## Typical Workflow

### 1. User requests a product

User: "Buy me a USB-C cable"

### 2. Search for products

Call `amazon_search query="USB-C cable"` and present options with prices in USD and USDC.

### 3. User selects a product

User: "I'll take the Anker one"

### 4. Show order preview

Call `amazon_order action="preview" asin="..."` to show full order details including:

- Product name and quantity
- Price in USD and USDC (1:1)
- Estimated delivery

Then ask: "Type 'yes' or 'confirm' to proceed with this order."

### 5. Wait for explicit confirmation

Only proceed if user explicitly confirms with "yes", "confirm", or "place the order".

If user says anything else (like "ok", "sure", "sounds good"), ask again:
"Please type 'yes' or 'confirm' to finalize your order."

### 6. Process USDC payment

1. Check wallet connection: `solana_wallet action="status"`
2. If not connected, help them connect: `solana_wallet action="connect"`
3. Check USDC balance: `solana_wallet action="balance"`
4. Create payment transaction: `solana_wallet action="sign_transaction" amount=X.XX memo="OrderID"`
5. Instruct user to approve in their wallet

### 7. Confirm order

After payment confirmation, call `amazon_order action="place"` and provide order confirmation with:

- Order ID
- Tracking information (when available)
- Estimated delivery date

## Example Conversation

```
User: I need wireless earbuds

Agent: [Calls amazon_search]
I found several wireless earbuds options:

1. Apple AirPods Pro (2nd Gen) - $199.99 (199.99 USDC)
2. Samsung Galaxy Buds2 Pro - $149.99 (149.99 USDC)
3. Anker Soundcore Liberty 4 NC - $79.99 (79.99 USDC)

All prices in USDC (1 USDC = $1 USD). Which one interests you?

User: The Anker ones look good

Agent: [Calls amazon_order preview]
Great choice! Here's your order preview:

📦 Anker Soundcore Liberty 4 NC Wireless Earbuds
   Quantity: 1
   Price: $79.99 (79.99 USDC)
   Estimated Delivery: Tuesday, Feb 10

To complete this purchase, type "yes" or "confirm".

User: yes

Agent: [Calls solana_wallet, then amazon_order place]
Please approve the USDC transaction in your Phantom wallet.
[Shows Phantom signing link]

✅ Order Confirmed!
Order ID: 114-ABC123-XYZ
Your Anker earbuds will arrive by Tuesday, Feb 10.
Payment: 79.99 USDC
Transaction: 5vH7...abc
```

## Network Configuration

The extension uses Solana **devnet** by default for safe testing.

- Devnet: Free test USDC, no real funds
- Mainnet: Real USDC funds (configure in plugin settings)

### Getting Test Tokens (Devnet)

1. **Get test SOL** (for transaction fees): https://faucet.solana.com
2. **Get test USDC**: https://faucet.circle.com

## USDC Mint Addresses

| Network | USDC Mint Address                              |
| ------- | ---------------------------------------------- |
| Devnet  | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` |
| Mainnet | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

## Troubleshooting

### Wallet won't connect

- Ensure Phantom/Solflare is installed
- Try refreshing the connection with `solana_wallet action="connect"`

### Insufficient USDC balance

- Check your balance: `solana_wallet action="balance"`
- On devnet, get free test USDC from https://faucet.circle.com

### Transaction failed

- Check wallet has sufficient SOL balance for fees (~0.001 SOL minimum)
- Ensure you have enough USDC for the purchase
- Ensure network matches (devnet vs mainnet)

### Associated Token Account error

- If this is your first USDC transaction, the wallet may need to create an Associated Token Account
- This is done automatically and costs a small amount of SOL (~0.002 SOL)
