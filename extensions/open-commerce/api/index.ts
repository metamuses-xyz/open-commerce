/**
 * Open Commerce API - Vercel Serverless Handler
 *
 * Deploy: cd extensions/open-commerce && npx vercel deploy --prod
 */

import { handle } from "hono/vercel";
import { createApp } from "./routes.js";

const app = createApp();

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);

export default app;
