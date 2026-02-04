/**
 * Shopping session state management for Open Commerce.
 * Tracks user's progress through the shopping flow.
 */

export type ShoppingPhase =
  | "discovery"
  | "selection"
  | "preview"
  | "confirmation"
  | "payment"
  | "complete";

export type SelectedProduct = {
  asin: string;
  title: string;
  price: number;
  brand?: string;
};

export type OrderPreview = {
  orderId: string;
  total: number;
  usdcAmount: number;
  createdAt: string;
  expiresAt: string;
};

export type ShoppingState = {
  sessionId: string;
  phase: ShoppingPhase;
  selectedProduct?: SelectedProduct;
  orderPreview?: OrderPreview;
  confirmationReceived: boolean;
  walletConnected: boolean;
  walletAddress?: string;
  walletBalance?: number;
  lastSearchQuery?: string;
  createdAt: string;
  updatedAt: string;
};

// In-memory session store (resets on restart)
const sessions = new Map<string, ShoppingState>();

// Preview validity duration (30 minutes)
const PREVIEW_VALIDITY_MS = 30 * 60 * 1000;

/**
 * Generate a unique session ID based on channel and user
 */
export function generateSessionKey(channel: string, userId: string): string {
  return `open-commerce:${channel}:${userId}`;
}

/**
 * Create a new shopping session
 */
export function createSession(sessionId: string): ShoppingState {
  const now = new Date().toISOString();
  const state: ShoppingState = {
    sessionId,
    phase: "discovery",
    confirmationReceived: false,
    walletConnected: false,
    createdAt: now,
    updatedAt: now,
  };
  sessions.set(sessionId, state);
  return state;
}

/**
 * Get or create a shopping session
 */
export function getOrCreateSession(sessionId: string): ShoppingState {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }
  return createSession(sessionId);
}

/**
 * Get an existing session
 */
export function getSession(sessionId: string): ShoppingState | undefined {
  return sessions.get(sessionId);
}

/**
 * Update shopping session state
 */
export function updateSession(sessionId: string, updates: Partial<ShoppingState>): ShoppingState {
  const state = getOrCreateSession(sessionId);
  const updated = {
    ...state,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  sessions.set(sessionId, updated);
  return updated;
}

/**
 * Set the selected product
 */
export function setSelectedProduct(sessionId: string, product: SelectedProduct): ShoppingState {
  return updateSession(sessionId, {
    selectedProduct: product,
    phase: "selection",
    confirmationReceived: false, // Reset confirmation when product changes
    orderPreview: undefined,
  });
}

/**
 * Set order preview
 */
export function setOrderPreview(
  sessionId: string,
  orderId: string,
  total: number,
  usdcAmount: number,
): ShoppingState {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PREVIEW_VALIDITY_MS);

  return updateSession(sessionId, {
    orderPreview: {
      orderId,
      total,
      usdcAmount,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
    phase: "preview",
    confirmationReceived: false,
  });
}

/**
 * Check if order preview is still valid
 */
export function isPreviewValid(sessionId: string): boolean {
  const state = sessions.get(sessionId);
  if (!state?.orderPreview) {
    return false;
  }

  const expiresAt = new Date(state.orderPreview.expiresAt);
  return new Date() < expiresAt;
}

/**
 * Set confirmation received
 */
export function setConfirmationReceived(sessionId: string, confirmed: boolean): ShoppingState {
  return updateSession(sessionId, {
    confirmationReceived: confirmed,
    phase: confirmed ? "confirmation" : "preview",
  });
}

/**
 * Set wallet connection status
 */
export function setWalletConnected(
  sessionId: string,
  connected: boolean,
  address?: string,
  balance?: number,
): ShoppingState {
  return updateSession(sessionId, {
    walletConnected: connected,
    walletAddress: address,
    walletBalance: balance,
  });
}

/**
 * Complete the order
 */
export function completeOrder(sessionId: string): ShoppingState {
  return updateSession(sessionId, {
    phase: "complete",
  });
}

/**
 * Reset session to discovery phase
 */
export function resetSession(sessionId: string): ShoppingState {
  return updateSession(sessionId, {
    phase: "discovery",
    selectedProduct: undefined,
    orderPreview: undefined,
    confirmationReceived: false,
  });
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * Get all active sessions (for debugging)
 */
export function getAllSessions(): Map<string, ShoppingState> {
  return new Map(sessions);
}

/**
 * Generate context string for system prompt injection
 */
export function getShoppingContext(sessionId: string): string {
  const state = sessions.get(sessionId);
  if (!state) {
    return "";
  }

  const lines = [
    "## Current Shopping Session",
    `- Phase: ${state.phase}`,
    `- Selected Product: ${state.selectedProduct?.title || "None"}`,
    `- Order Preview: ${state.orderPreview ? "Shown" : "Not shown"}`,
    `- Confirmation: ${state.confirmationReceived ? "Received" : "Pending"}`,
    `- Wallet Connected: ${state.walletConnected ? "Yes" : "No"}`,
  ];

  if (state.orderPreview && isPreviewValid(sessionId)) {
    lines.push(`- Preview Order ID: ${state.orderPreview.orderId}`);
    lines.push(`- Preview Total: ${state.orderPreview.usdcAmount.toFixed(2)} USDC`);
  }

  return lines.join("\n");
}
