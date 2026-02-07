/**
 * Open Commerce REST API - Local Development Server
 *
 * Run: pnpm dev
 */

import { serve } from "@hono/node-server";
import { createApp, NETWORK, USDC_MINT } from "./routes.js";

const app = createApp();

const port = parseInt(process.env.PORT || "3000");
console.log(`Open Commerce API starting on port ${port}...`);
console.log(`Network: ${NETWORK}`);
console.log(`USDC Mint: ${USDC_MINT.devnet.toString()}`);

serve({ fetch: app.fetch, port });

console.log(`Server running at http://localhost:${port}`);

export default app;
