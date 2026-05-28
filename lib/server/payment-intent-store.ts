import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export type SignupPlan = 'community' | 'pro' | 'quant';
export type BillingCycle = 'monthly' | 'yearly';
export type IntentStatus = 'created' | 'pending' | 'paid' | 'failed' | 'expired';

export interface PaymentIntent {
  id: string;
  email: string;
  walletAddress?: string;
  plan: SignupPlan;
  billing: BillingCycle;
  amountMinor: number;
  currency: 'USDT';
  network: 'Arbitrum';
  receiverAddress: string;
  status: IntentStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  txHash?: string;
  txFrom?: string;
  verifiedAt?: string;
  paidAmountMinor?: number;
  lagoCustomerId?: string;
  lagoSubscriptionId?: string;
  lagoPaymentId?: string;
  lagoSyncedAt?: string;
  lagoSyncError?: string;
}

interface StoreShape {
  intents: PaymentIntent[];
}

const DATA_DIR = join(process.cwd(), 'data');
const STORE_PATH = join(DATA_DIR, 'signup-payment-intents.json');

function ensureStore(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!existsSync(STORE_PATH)) {
    const initial: StoreShape = { intents: [] };
    writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

function readStore(): StoreShape {
  ensureStore();
  try {
    const raw = readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    if (!Array.isArray(parsed.intents)) {
      return { intents: [] };
    }
    return { intents: parsed.intents };
  } catch {
    return { intents: [] };
  }
}

function writeStore(store: StoreShape): void {
  ensureStore();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function createIntent(intent: PaymentIntent): PaymentIntent {
  const store = readStore();
  store.intents.push(intent);
  writeStore(store);
  return intent;
}

export function getIntentById(id: string): PaymentIntent | null {
  const store = readStore();
  return store.intents.find((x) => x.id === id) ?? null;
}

export function listIntents(options?: {
  limit?: number;
  status?: IntentStatus;
  email?: string;
}): PaymentIntent[] {
  const store = readStore();
  const limit = Math.max(1, Math.min(500, Number(options?.limit ?? 100)));
  const status = options?.status;
  const email = options?.email?.trim().toLowerCase();

  let rows = [...store.intents];
  if (status) {
    rows = rows.filter((x) => x.status === status);
  }

  if (email) {
    rows = rows.filter((x) => x.email.toLowerCase().includes(email));
  }

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return rows.slice(0, limit);
}

export function updateIntent(id: string, patch: Partial<PaymentIntent>): PaymentIntent | null {
  const store = readStore();
  const idx = store.intents.findIndex((x) => x.id === id);
  if (idx === -1) {
    return null;
  }

  const updated: PaymentIntent = {
    ...store.intents[idx],
    ...patch,
    id: store.intents[idx].id,
    updatedAt: new Date().toISOString(),
  };

  store.intents[idx] = updated;
  writeStore(store);
  return updated;
}

export function expireIntentIfNeeded(intent: PaymentIntent): PaymentIntent {
  if (intent.status === 'paid' || intent.status === 'failed' || intent.status === 'expired') {
    return intent;
  }

  if (Date.now() > new Date(intent.expiresAt).getTime()) {
    const updated = updateIntent(intent.id, { status: 'expired' });
    return updated ?? { ...intent, status: 'expired' };
  }

  return intent;
}
