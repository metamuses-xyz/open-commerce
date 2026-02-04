# Open Commerce - USDC Shopping Agent

AI-powered shopping agent that enables autonomous purchasing using USDC on Solana.

## Overview

Open Commerce enables AI agents to discover, compare, and purchase real-world goods using USDC stablecoin payments on Solana. The agent handles the entire shopping workflow - from product search to payment execution - without human intervention.

## Why USDC for Agentic Commerce?

| Feature                 | USDC                   | Traditional Crypto             |
| ----------------------- | ---------------------- | ------------------------------ |
| **Price Stability**     | 1 USDC = $1 USD always | Volatile, unpredictable        |
| **Settlement Speed**    | Sub-second on Solana   | Varies by network              |
| **Transaction Cost**    | < $0.001 per tx        | Can be high during congestion  |
| **Agent Compatibility** | Predictable pricing    | Requires real-time price feeds |

Agents can price services predictably with USDC - no slippage concerns, no volatility risk.

## Features

- **Product Discovery**: Search Amazon catalog with AI-powered filtering
- **USDC Payments**: Stable stablecoin payments (1:1 with USD)
- **Wallet Integration**: Phantom/Solflare wallet connection
- **SPL Token Transfers**: Native USDC transfers using Solana SPL tokens
- **Order Tracking**: Full order lifecycle management

## Tools

### amazon_search

Search for products with USDC pricing.

```
amazon_search query="wireless earbuds" maxResults=5
```

### price_quote

Get USDC price (1:1 with USD, no volatility).

```
price_quote usdAmount=79.99
```

### solana_wallet

Manage wallet and USDC transactions.

```
# Check USDC balance
solana_wallet action="balance" publicKey="YOUR_KEY"

# Create USDC payment
solana_wallet action="sign_transaction" amount=79.99 memo="Order-12345"
```

### amazon_order

Preview and place orders with USDC payment.

```
# Preview order
amazon_order action="preview" asin="B08T5QN6S3"

# Place order (after user confirmation)
amazon_order action="place" asin="B08T5QN6S3" paymentTxSignature="..."
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     AI Agent                            │
├─────────────────────────────────────────────────────────┤
│  amazon_search  │  price_quote  │  amazon_order         │
├─────────────────────────────────────────────────────────┤
│                   solana_wallet                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Connect     │  │ Balance     │  │ USDC Transfer   │ │
│  │ Phantom     │  │ USDC/SOL    │  │ SPL Token TX    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────┤
│              Solana Network (Devnet/Mainnet)            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ USDC Mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGk │   │
│  │ (Devnet: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp) │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Install dependencies
pnpm install

# Build the extension
pnpm build
```

## Configuration

Configure in `openclaw.plugin.json`:

```json
{
  "treasuryAddress": "YOUR_SOLANA_ADDRESS",
  "network": "devnet",
  "usdcMintAddress": "OPTIONAL_CUSTOM_MINT"
}
```

## Network Configuration

| Network | USDC Mint                                      | Usage      |
| ------- | ---------------------------------------------- | ---------- |
| Devnet  | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` | Testing    |
| Mainnet | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Production |

## Getting Test Tokens (Devnet)

1. **SOL** (for fees): https://faucet.solana.com
2. **USDC**: https://faucet.circle.com

## Demo Workflow

```
User: Buy me wireless earbuds

Agent: [Searches products]
Found 3 options:
1. Apple AirPods Pro - $199.99 (199.99 USDC)
2. Samsung Galaxy Buds - $149.99 (149.99 USDC)
3. Anker Soundcore - $79.99 (79.99 USDC)

User: The Anker ones

Agent: [Shows preview]
📦 Anker Soundcore Liberty 4 NC
   Price: $79.99 (79.99 USDC)
   Delivery: Tuesday, Feb 10

Type "yes" to confirm.

User: yes

Agent: [Creates USDC transaction]
Please approve the 79.99 USDC transaction in your wallet.
[Phantom signing link]

✅ Order Confirmed!
Order ID: 114-ABC123-XYZ
Payment: 79.99 USDC
```

## Why Agents Are Better for Commerce

1. **Speed**: Agents initiate payments in <100ms vs minutes for humans
2. **Stability**: USDC eliminates price volatility during checkout
3. **Automation**: Full purchase flow without human intervention
4. **Predictability**: 1 USDC = $1 USD, always

## Tech Stack

- **Runtime**: TypeScript/Node.js
- **Blockchain**: Solana
- **Token**: USDC (SPL Token)
- **Libraries**: `@solana/web3.js`, `@solana/spl-token`

## License

MIT

## Hackathon Submission

**Track**: AgenticCommerce
**Tag**: `#USDCHackathon ProjectSubmission AgenticCommerce`

This project demonstrates autonomous AI agents purchasing real-world goods using USDC on Solana, showcasing faster, more predictable transactions than human-driven e-commerce.
