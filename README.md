# Open Commerce - AI-Powered Shopping with USDC on Solana

<p align="center">
  <strong>Autonomous AI agents that discover, compare, and purchase real-world goods using USDC stablecoin on Solana</strong>
</p>

<p align="center">
  <a href="https://github.com/metamuses-xyz/open-commerce/actions"><img src="https://img.shields.io/github/actions/workflow/status/metamuses-xyz/open-commerce/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="https://solana.com"><img src="https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana" alt="Solana"></a>
</p>

## Overview

Open Commerce enables AI agents to autonomously shop online using USDC payments on Solana. The agent handles the entire workflow - from product discovery to payment execution - without human intervention.

**Hackathon Track**: AgenticCommerce | **Tag**: `#USDCHackathon ProjectSubmission AgenticCommerce`

## Why USDC for Agentic Commerce?

| Feature                 | USDC                   | Traditional Crypto             |
| ----------------------- | ---------------------- | ------------------------------ |
| **Price Stability**     | 1 USDC = $1 USD always | Volatile, unpredictable        |
| **Settlement Speed**    | Sub-second on Solana   | Varies by network              |
| **Transaction Cost**    | < $0.001 per tx        | Can be high during congestion  |
| **Agent Compatibility** | Predictable pricing    | Requires real-time price feeds |

Agents can price services predictably with USDC - no slippage concerns, no volatility risk.

## Features

- **Product Discovery**: Search product catalog with AI-powered filtering (powered by Fake Store API)
- **USDC Payments**: Stable stablecoin payments (1:1 with USD)
- **Wallet Integration**: Phantom/Solflare wallet connection
- **SPL Token Transfers**: Native USDC transfers using Solana SPL tokens
- **Order Tracking**: Full order lifecycle management
- **REST API**: HTTP endpoints for agent-to-agent interaction

## Quick Start

### Prerequisites

- Node.js >= 22
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/metamuses-xyz/open-commerce.git
cd open-commerce

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Run the API Server

```bash
cd extensions/open-commerce
npx tsx api/server.ts
```

Server runs at `http://localhost:3000`

### Test the API

```bash
# Search for products
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "backpack"}'

# Create an order
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"asin": "FS-1"}'
```

## REST API

**Base URL**: `http://localhost:3000` (local) or deploy to Vercel

| Method | Endpoint           | Description                 |
| ------ | ------------------ | --------------------------- |
| GET    | `/`                | API info and health check   |
| POST   | `/api/search`      | Search products             |
| POST   | `/api/quote`       | Get USDC price quote        |
| POST   | `/api/order`       | Create order preview        |
| GET    | `/api/order/:id`   | Get order status            |
| POST   | `/api/pay`         | Execute USDC payment        |
| GET    | `/api/verify/:sig` | Verify transaction on-chain |

### Example: Full Purchase Flow

```bash
# 1. Search for products
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "jacket", "maxResults": 3}'

# Response:
# {
#   "products": [
#     {"asin": "FS-3", "title": "Mens Cotton Jacket", "price": 55.99, ...},
#     ...
#   ]
# }

# 2. Create order preview
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"asin": "FS-3"}'

# Response:
# {
#   "orderId": "ORD-...",
#   "product": "Mens Cotton Jacket",
#   "priceUsdc": 55.99,
#   "paymentInstructions": {...}
# }

# 3. Execute USDC payment
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -d '{"to": "RECIPIENT_WALLET", "amount": 55.99}'
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

## Network Configuration

| Network | USDC Mint                                      | Usage      |
| ------- | ---------------------------------------------- | ---------- |
| Devnet  | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` | Testing    |
| Mainnet | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Production |

## Getting Test Tokens (Devnet)

1. **SOL** (for transaction fees): https://faucet.solana.com
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

✅ Order Confirmed!
Order ID: 114-ABC123-XYZ
Payment: 79.99 USDC
TX: https://explorer.solana.com/tx/...?cluster=devnet
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
- **Product Data**: Fake Store API
- **Web Framework**: Hono
- **Libraries**: `@solana/web3.js`, `@solana/spl-token`

## Project Structure

```
open-commerce/
├── extensions/open-commerce/     # Main extension
│   ├── api/                      # REST API server
│   │   ├── server.ts            # Local Node.js server
│   │   └── index.ts             # Vercel serverless handler
│   ├── src/
│   │   ├── data/products.ts     # Product catalog (async API)
│   │   ├── services/
│   │   │   ├── product-api.ts   # Fake Store API client
│   │   │   └── price-feed.ts    # USDC price service
│   │   └── tools/               # AI agent tools
│   └── README.md
└── README.md                     # This file
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Type check
pnpm tsgo

# Lint
pnpm lint

# Run tests
pnpm test
```

## Deploy to Vercel

```bash
cd extensions/open-commerce
vercel deploy --prod
```

## License

MIT

---

**Open Commerce** - Enabling AI agents to shop autonomously with USDC on Solana.
