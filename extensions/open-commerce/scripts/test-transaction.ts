#!/usr/bin/env npx tsx
/**
 * Test Transaction Script
 *
 * Executes a real USDC transfer on Solana devnet to generate on-chain proof.
 *
 * Prerequisites:
 * 1. Get devnet SOL: https://faucet.solana.com
 * 2. Get devnet USDC: https://faucet.circle.com
 *
 * Usage:
 *   npx tsx scripts/test-transaction.ts
 *
 * Environment:
 *   PRIVATE_KEY - JSON array of wallet private key bytes
 *   TO_ADDRESS - Recipient wallet address (optional, uses self-transfer if not set)
 *   AMOUNT - Amount in USDC (default: 1.00)
 */

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

// Configuration
const USDC_MINT_DEVNET = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
const USDC_DECIMALS = 6;
const NETWORK = "devnet";

async function main() {
  console.log("=== Open Commerce Test Transaction ===\n");

  // Parse environment
  const privateKeyJson = process.env.PRIVATE_KEY;
  if (!privateKeyJson) {
    console.error("Error: PRIVATE_KEY environment variable required");
    console.error("Example: PRIVATE_KEY='[1,2,3,...]' npx tsx scripts/test-transaction.ts");
    process.exit(1);
  }

  let keypair: Keypair;
  try {
    const keyArray = JSON.parse(privateKeyJson);
    keypair = Keypair.fromSecretKey(new Uint8Array(keyArray));
  } catch {
    console.error("Error: Invalid PRIVATE_KEY format. Provide JSON array of bytes.");
    process.exit(1);
  }

  const fromPubkey = keypair.publicKey;
  const toAddress = process.env.TO_ADDRESS || fromPubkey.toString(); // Self-transfer if not specified
  const amount = parseFloat(process.env.AMOUNT || "1.00");

  let toPubkey: PublicKey;
  try {
    toPubkey = new PublicKey(toAddress);
  } catch {
    console.error("Error: Invalid TO_ADDRESS");
    process.exit(1);
  }

  console.log(`Network: ${NETWORK}`);
  console.log(`From: ${fromPubkey.toString()}`);
  console.log(`To: ${toPubkey.toString()}`);
  console.log(`Amount: ${amount} USDC`);
  console.log(`USDC Mint: ${USDC_MINT_DEVNET.toString()}`);
  console.log("");

  // Connect to Solana
  const connection = new Connection(clusterApiUrl(NETWORK), "confirmed");

  // Check SOL balance
  const solBalance = await connection.getBalance(fromPubkey);
  console.log(`SOL Balance: ${solBalance / 1e9} SOL`);

  if (solBalance < 10000) {
    console.error("Error: Insufficient SOL for fees. Get SOL from https://faucet.solana.com");
    process.exit(1);
  }

  // Get ATAs
  const fromAta = await getAssociatedTokenAddress(USDC_MINT_DEVNET, fromPubkey);
  const toAta = await getAssociatedTokenAddress(USDC_MINT_DEVNET, toPubkey);

  // Check USDC balance
  let usdcBalance = 0;
  try {
    const account = await getAccount(connection, fromAta);
    usdcBalance = Number(account.amount) / Math.pow(10, USDC_DECIMALS);
  } catch {
    console.error("Error: No USDC token account. Get USDC from https://faucet.circle.com");
    process.exit(1);
  }

  console.log(`USDC Balance: ${usdcBalance} USDC`);

  if (usdcBalance < amount) {
    console.error(`Error: Insufficient USDC balance. Need ${amount}, have ${usdcBalance}`);
    process.exit(1);
  }

  console.log("\nBuilding transaction...");

  // Build transaction
  const transaction = new Transaction();

  // Check if recipient ATA exists (only if different from sender)
  if (!fromPubkey.equals(toPubkey)) {
    try {
      await getAccount(connection, toAta);
    } catch {
      console.log("Creating recipient token account...");
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          toAta,
          toPubkey,
          USDC_MINT_DEVNET,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }
  }

  // Add transfer instruction
  const rawAmount = BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));
  transaction.add(
    createTransferCheckedInstruction(
      fromAta,
      USDC_MINT_DEVNET,
      toAta,
      fromPubkey,
      rawAmount,
      USDC_DECIMALS,
    ),
  );

  console.log("Sending transaction...");

  // Send transaction
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);

    console.log("\n=== Transaction Confirmed ===");
    console.log(`Signature: ${signature}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log("");
    console.log("=== Proof of Work for Submission ===");
    console.log(`- Network: Solana Devnet`);
    console.log(`- Transaction: ${signature}`);
    console.log(`- Amount: ${amount} USDC`);
    console.log(`- From: ${fromPubkey.toString()}`);
    console.log(`- To: ${toPubkey.toString()}`);
    console.log(`- Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (err) {
    console.error("Transaction failed:", err);
    process.exit(1);
  }
}

main().catch(console.error);
