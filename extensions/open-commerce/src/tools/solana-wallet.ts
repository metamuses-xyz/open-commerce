/**
 * Solana wallet tool for wallet connection, balance checking, and transaction signing.
 * Supports Phantom and Solflare wallets on devnet and mainnet.
 * Uses USDC (SPL token) for stable payments.
 */

import { Type } from "@sinclair/typebox";
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
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import type { OpenClawPluginApi } from "../../../../src/plugins/types.js";

// Official USDC mint addresses
const USDC_MINT = {
  devnet: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  "mainnet-beta": new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
};
const USDC_DECIMALS = 6;

type WalletSession = {
  publicKey: string;
  connected: boolean;
  network: "devnet" | "mainnet-beta";
  connectedAt: string;
};

// In-memory wallet session store (for demo purposes)
const walletSessions = new Map<string, WalletSession>();

function getNetwork(api: OpenClawPluginApi): "devnet" | "mainnet-beta" {
  const config = api.pluginConfig;
  if (config && typeof config.network === "string") {
    if (config.network === "mainnet-beta" || config.network === "devnet") {
      return config.network;
    }
  }
  return "devnet";
}

function getTreasuryAddress(api: OpenClawPluginApi): string {
  const config = api.pluginConfig;
  if (config && typeof config.treasuryAddress === "string" && config.treasuryAddress) {
    return config.treasuryAddress;
  }
  // Default treasury for demo (devnet)
  return "11111111111111111111111111111111";
}

function getUsdcMint(api: OpenClawPluginApi): PublicKey {
  const config = api.pluginConfig;
  const network = getNetwork(api);

  // Allow custom USDC mint address (for testing with different tokens)
  if (config && typeof config.usdcMintAddress === "string" && config.usdcMintAddress) {
    return new PublicKey(config.usdcMintAddress);
  }

  return USDC_MINT[network];
}

export function createSolanaWalletTool(api: OpenClawPluginApi) {
  return {
    name: "solana_wallet",
    description:
      "Manage Solana wallet connection for USDC payments. Supports connect, status, balance, and sign_transaction actions.",
    parameters: Type.Object({
      action: Type.Unsafe<"connect" | "status" | "balance" | "sign_transaction">({
        type: "string",
        enum: ["connect", "status", "balance", "sign_transaction"],
        description:
          "Action to perform: connect (generate wallet connection URL), status (check connection), balance (get USDC balance), sign_transaction (request USDC transfer signature)",
      }),
      publicKey: Type.Optional(
        Type.String({
          description: "Wallet public key (required for balance and sign_transaction)",
        }),
      ),
      transaction: Type.Optional(
        Type.String({
          description: "Base64-encoded transaction to sign (required for sign_transaction)",
        }),
      ),
      amount: Type.Optional(
        Type.Number({
          description: "Amount in USDC to transfer (for sign_transaction)",
        }),
      ),
      memo: Type.Optional(
        Type.String({
          description: "Transaction memo (e.g., order reference)",
        }),
      ),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const action = typeof params.action === "string" ? params.action : "";

      switch (action) {
        case "connect":
          return handleConnect(api);
        case "status":
          return handleStatus(params);
        case "balance":
          return handleBalance(api, params);
        case "sign_transaction":
          return handleSignTransaction(api, params);
        default:
          throw new Error(
            `Unknown action: ${action}. Valid actions: connect, status, balance, sign_transaction`,
          );
      }
    },
  };
}

function handleConnect(api: OpenClawPluginApi) {
  const network = getNetwork(api);

  // Generate a unique session ID for this connection attempt
  const sessionId = crypto.randomUUID();

  // For demo, we simulate the wallet connection flow
  // In production, this would integrate with Phantom/Solflare deeplinks
  const phantomUrl = `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent("https://open-commerce.ai")}&dapp_encryption_public_key=${sessionId}&cluster=${network}&redirect_link=${encodeURIComponent(`open-commerce://wallet-callback?session=${sessionId}`)}`;

  const lines = [
    `**Connect Your Solana Wallet**`,
    "",
    `Network: ${network}`,
    `Payment: USDC (stablecoin, 1 USDC = $1 USD)`,
    "",
    `To connect your wallet, you have two options:`,
    "",
    `**Option 1: Phantom Wallet**`,
    `Open this URL in your browser or Phantom app:`,
    phantomUrl,
    "",
    `**Option 2: Manual Connection**`,
    `If you already have a wallet connected, provide your public key using:`,
    `solana_wallet action="status" publicKey="YOUR_PUBLIC_KEY"`,
    "",
    network === "devnet"
      ? `_Note: On devnet, you can get test USDC from https://faucet.circle.com_`
      : `_Note: Real USDC will be used for purchases_`,
  ];

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    details: {
      action: "connect",
      network,
      sessionId,
      phantomUrl,
    },
  };
}

function handleStatus(params: Record<string, unknown>) {
  const publicKey = typeof params.publicKey === "string" ? params.publicKey.trim() : "";

  if (publicKey) {
    // Validate public key format
    try {
      new PublicKey(publicKey);
    } catch {
      throw new Error("Invalid Solana public key format");
    }

    // Create/update session
    const session: WalletSession = {
      publicKey,
      connected: true,
      network: "devnet",
      connectedAt: new Date().toISOString(),
    };
    walletSessions.set(publicKey, session);

    return {
      content: [
        {
          type: "text",
          text: [
            `**Wallet Connected**`,
            "",
            `Address: ${publicKey}`,
            `Network: ${session.network}`,
            `Connected at: ${session.connectedAt}`,
          ].join("\n"),
        },
      ],
      details: session,
    };
  }

  // Check if we have any connected session
  const sessions = Array.from(walletSessions.values()).filter((s) => s.connected);

  if (sessions.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: 'No wallet connected. Use `solana_wallet action="connect"` to connect a wallet.',
        },
      ],
      details: { connected: false },
    };
  }

  const session = sessions[0];
  return {
    content: [
      {
        type: "text",
        text: [
          `**Wallet Status**`,
          "",
          `Address: ${session.publicKey}`,
          `Network: ${session.network}`,
          `Connected: ${session.connected}`,
        ].join("\n"),
      },
    ],
    details: session,
  };
}

async function handleBalance(api: OpenClawPluginApi, params: Record<string, unknown>) {
  const publicKey = typeof params.publicKey === "string" ? params.publicKey.trim() : "";

  if (!publicKey) {
    // Check for connected session
    const sessions = Array.from(walletSessions.values()).filter((s) => s.connected);
    if (sessions.length === 0) {
      throw new Error("No wallet connected. Provide publicKey or connect a wallet first.");
    }
    return handleBalance(api, { ...params, publicKey: sessions[0].publicKey });
  }

  // Validate public key
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(publicKey);
  } catch {
    throw new Error("Invalid Solana public key format");
  }

  const network = getNetwork(api);
  const connection = new Connection(clusterApiUrl(network), "confirmed");
  const usdcMint = getUsdcMint(api);

  // Fetch SOL balance (for fees)
  let solBalance: number;
  try {
    const lamports = await connection.getBalance(pubkey);
    solBalance = lamports / LAMPORTS_PER_SOL;
  } catch (err) {
    throw new Error(
      `Failed to fetch SOL balance: ${err instanceof Error ? err.message : String(err)}`,
      {
        cause: err,
      },
    );
  }

  // Fetch USDC balance via Associated Token Account
  let usdcBalance = 0;
  try {
    const ata = await getAssociatedTokenAddress(usdcMint, pubkey);
    const tokenAccount = await getAccount(connection, ata);
    // Convert from raw units (6 decimals) to USDC
    usdcBalance = Number(tokenAccount.amount) / Math.pow(10, USDC_DECIMALS);
  } catch {
    // Account doesn't exist or other error - USDC balance is 0
    // This is normal for wallets that haven't received USDC yet
  }

  const lines = [
    `**Wallet Balance**`,
    "",
    `Address: ${publicKey}`,
    `Network: ${network}`,
    "",
    `| Token | Balance | Note |`,
    `|-------|---------|------|`,
    `| USDC | ${usdcBalance.toFixed(2)} USDC | For purchases |`,
    `| SOL | ${solBalance.toFixed(4)} SOL | For fees |`,
    "",
  ];

  if (network === "devnet") {
    lines.push(`_Tips:_`);
    lines.push(`_- Get test USDC: https://faucet.circle.com_`);
    lines.push(`_- Get test SOL (for fees): https://faucet.solana.com_`);
  }

  const sufficientFees = solBalance >= 0.001;
  if (!sufficientFees) {
    lines.push("");
    lines.push(`⚠️ **Low SOL balance** - You need at least 0.001 SOL for transaction fees.`);
  }

  return {
    content: [{ type: "text", text: lines.filter(Boolean).join("\n") }],
    details: {
      publicKey,
      network,
      balances: {
        usdc: usdcBalance,
        sol: solBalance,
      },
      sufficientFees,
    },
  };
}

async function handleSignTransaction(api: OpenClawPluginApi, params: Record<string, unknown>) {
  const publicKey = typeof params.publicKey === "string" ? params.publicKey.trim() : "";
  const amount = typeof params.amount === "number" ? params.amount : 0;
  const memo = typeof params.memo === "string" ? params.memo : "";

  if (!publicKey) {
    // Check for connected session
    const sessions = Array.from(walletSessions.values()).filter((s) => s.connected);
    if (sessions.length === 0) {
      throw new Error("No wallet connected. Provide publicKey or connect a wallet first.");
    }
    return handleSignTransaction(api, { ...params, publicKey: sessions[0].publicKey });
  }

  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  // Validate public key
  let fromPubkey: PublicKey;
  try {
    fromPubkey = new PublicKey(publicKey);
  } catch {
    throw new Error("Invalid Solana public key format");
  }

  const network = getNetwork(api);
  const treasuryAddress = getTreasuryAddress(api);
  const usdcMint = getUsdcMint(api);

  let toPubkey: PublicKey;
  try {
    toPubkey = new PublicKey(treasuryAddress);
  } catch {
    throw new Error("Invalid treasury address configuration");
  }

  const connection = new Connection(clusterApiUrl(network), "confirmed");

  // Get Associated Token Accounts for USDC
  const fromAta = await getAssociatedTokenAddress(usdcMint, fromPubkey);
  const toAta = await getAssociatedTokenAddress(usdcMint, toPubkey);

  // Build transaction
  const transaction = new Transaction();

  // Check if destination ATA exists, if not, create it
  try {
    await getAccount(connection, toAta);
  } catch {
    // ATA doesn't exist, add instruction to create it
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey, // payer
        toAta, // associatedToken
        toPubkey, // owner
        usdcMint, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  // Convert USDC amount to raw units (6 decimals)
  const rawAmount = BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));

  // Add USDC transfer instruction
  transaction.add(
    createTransferCheckedInstruction(
      fromAta, // source
      usdcMint, // mint
      toAta, // destination
      fromPubkey, // owner
      rawAmount, // amount in raw units
      USDC_DECIMALS, // decimals
    ),
  );

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  // Serialize for signing (base64)
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  const base64Transaction = serialized.toString("base64");

  // Build Phantom signing URL
  const phantomSignUrl = `https://phantom.app/ul/v1/signAndSendTransaction?transaction=${encodeURIComponent(base64Transaction)}&cluster=${network}`;

  const lines = [
    `**USDC Transaction Ready for Signing**`,
    "",
    `From: ${publicKey}`,
    `To: ${treasuryAddress}`,
    `Amount: ${amount.toFixed(2)} USDC`,
    memo ? `Memo: ${memo}` : "",
    `Network: ${network}`,
    "",
    `**Sign with Phantom:**`,
    phantomSignUrl,
    "",
    `Or scan this QR code with your Phantom wallet to approve the transaction.`,
    "",
    `_This transaction will transfer ${amount.toFixed(2)} USDC to complete your order._`,
    `_USDC is a stablecoin: 1 USDC = $1 USD_`,
    `_Blockhash expires at block ${lastValidBlockHeight}._`,
  ];

  return {
    content: [{ type: "text", text: lines.filter(Boolean).join("\n") }],
    details: {
      action: "sign_transaction",
      from: publicKey,
      to: treasuryAddress,
      amount,
      currency: "USDC",
      memo,
      network,
      transaction: base64Transaction,
      blockhash,
      lastValidBlockHeight,
      phantomSignUrl,
    },
  };
}
