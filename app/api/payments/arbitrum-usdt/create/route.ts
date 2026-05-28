import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { createIntent, type BillingCycle, type SignupPlan } from '@/lib/server/payment-intent-store';

export const runtime = 'nodejs';

const PLAN_PRICES_MINOR: Record<SignupPlan, Record<BillingCycle, number>> = {
  community: {
    monthly: 299_000000,
    yearly: 2699_000000,
  },
  pro: {
    monthly: 599_000000,
    yearly: 5399_000000,
  },
  quant: {
    monthly: 999_000000,
    yearly: 8999_000000,
  },
};

const SUPPORTED_PLANS: SignupPlan[] = ['community', 'pro', 'quant'];
const SUPPORTED_BILLING: BillingCycle[] = ['monthly', 'yearly'];

type CreateIntentBody = {
  email?: string;
  walletAddress?: string;
  plan?: SignupPlan;
  billing?: BillingCycle;
  receiverAddress?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatUsdt(minor: number): string {
  return (minor / 1_000000).toFixed(6).replace(/\.0+$/, '');
}

function getConfiguredReceivers(): string[] {
  const rawList = String(process.env.USDT_ARB_RECEIVERS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const single = String(process.env.USDT_ARB_RECEIVER ?? '').trim();
  const combined = [...rawList, ...(single ? [single] : [])];

  const normalized = combined.map((x) => x.toLowerCase());
  const unique = [...new Set(normalized)];
  return unique.filter((x) => isAddress(x));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateIntentBody;

    const email = String(body?.email ?? '').trim().toLowerCase();
    const walletAddressRaw = String(body?.walletAddress ?? '').trim().toLowerCase();
    const plan = (body?.plan ?? 'pro') as SignupPlan;
    const billing = (body?.billing ?? 'monthly') as BillingCycle;

    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'Email khong hop le.' }, { status: 400 });
    }

    if (walletAddressRaw && !isAddress(walletAddressRaw)) {
      return NextResponse.json({ ok: false, error: 'walletAddress khong hop le.' }, { status: 400 });
    }

    if (!SUPPORTED_PLANS.includes(plan)) {
      return NextResponse.json({ ok: false, error: 'Plan khong hop le.' }, { status: 400 });
    }

    if (!SUPPORTED_BILLING.includes(billing)) {
      return NextResponse.json({ ok: false, error: 'Billing cycle khong hop le.' }, { status: 400 });
    }

    const configuredReceivers = getConfiguredReceivers();
    if (configuredReceivers.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'USDT_ARB_RECEIVER hoặc USDT_ARB_RECEIVERS chua duoc cau hinh hop le tren server.',
        },
        { status: 500 }
      );
    }

    const requestedReceiver = String(body?.receiverAddress ?? '')
      .trim()
      .toLowerCase();

    let receiverAddress = configuredReceivers[0];
    if (requestedReceiver) {
      if (!isAddress(requestedReceiver)) {
        return NextResponse.json({ ok: false, error: 'receiverAddress khong hop le.' }, { status: 400 });
      }

      if (!configuredReceivers.includes(requestedReceiver)) {
        return NextResponse.json({ ok: false, error: 'receiverAddress chua duoc cap phep tren server.' }, { status: 400 });
      }

      receiverAddress = requestedReceiver;
    }

    const amountMinor = PLAN_PRICES_MINOR[plan][billing];
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 60 * 1000).toISOString();

    const intent = createIntent({
      id: randomUUID(),
      email,
      walletAddress: walletAddressRaw || undefined,
      plan,
      billing,
      amountMinor,
      currency: 'USDT',
      network: 'Arbitrum',
      receiverAddress,
      status: 'created',
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      expiresAt,
    });

    return NextResponse.json({
      ok: true,
      orderId: intent.id,
      network: intent.network,
      currency: intent.currency,
      receiverAddress: intent.receiverAddress,
      amountMinor: intent.amountMinor,
      amountUsdt: formatUsdt(intent.amountMinor),
      plan: intent.plan,
      billing: intent.billing,
      expiresAt: intent.expiresAt,
      status: intent.status,
      availableReceivers: configuredReceivers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected server error',
      },
      { status: 500 }
    );
  }
}
