import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { listIntents, updateIntent } from '@/lib/server/payment-intent-store';

export const runtime = 'nodejs';

function verifySignature(rawBody: string, headerSignature: string): boolean {
  const secret = String(process.env.LAGO_WEBHOOK_SECRET ?? '').trim();
  if (!secret) {
    return true;
  }

  if (!headerSignature) {
    return false;
  }

  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(headerSignature.trim());
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, unknown>;
}

function extractExternalRef(payload: Record<string, unknown>): string {
  const payment = asRecord(payload.payment);
  const metadata = asRecord(payment.metadata);
  const orderId = String(metadata.order_id ?? '').trim();
  if (orderId) {
    return orderId;
  }

  const reference = String(payment.reference ?? '').trim();
  if (reference) {
    return reference;
  }

  return '';
}

function findLatestIntentByEmail(email: string) {
  const intents = listIntents({ email, limit: 500 });
  if (intents.length === 0) {
    return null;
  }
  return intents[0];
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sigHeader = request.headers.get('x-lago-signature') ?? '';

  if (!verifySignature(rawBody, sigHeader)) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = String(parsed.event_type ?? parsed.type ?? '').trim();
  const data = asRecord(parsed.data);

  const directOrderId = extractExternalRef(data);
  if (directOrderId) {
    const payment = asRecord(data.payment);
    const paymentId = String(payment.lago_id ?? payment.id ?? '').trim();
    if (paymentId) {
      updateIntent(directOrderId, {
        lagoPaymentId: paymentId,
        lagoSyncedAt: new Date().toISOString(),
        lagoSyncError: undefined,
      });
    }
  }

  const customer = asRecord(data.customer);
  const customerEmail = String(customer.email ?? '').trim().toLowerCase();
  const customerId = String(customer.lago_id ?? customer.id ?? '').trim();
  if (customerEmail && customerId) {
    const intent = findLatestIntentByEmail(customerEmail);
    if (intent) {
      updateIntent(intent.id, {
        lagoCustomerId: customerId,
      });
    }
  }

  const subscription = asRecord(data.subscription);
  const subscriptionId = String(subscription.lago_id ?? subscription.id ?? '').trim();
  const externalCustomerId = String(subscription.external_customer_id ?? '').trim().toLowerCase();
  if (externalCustomerId && subscriptionId) {
    const intent = findLatestIntentByEmail(externalCustomerId);
    if (intent) {
      updateIntent(intent.id, {
        lagoSubscriptionId: subscriptionId,
      });
    }
  }

  return NextResponse.json({ ok: true, received: true, eventType: eventType || null });
}
