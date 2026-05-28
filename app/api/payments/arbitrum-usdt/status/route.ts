import { NextRequest, NextResponse } from 'next/server';

import { expireIntentIfNeeded, getIntentById } from '@/lib/server/payment-intent-store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId')?.trim() ?? '';

  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'Thieu orderId.' }, { status: 400 });
  }

  const found = getIntentById(orderId);
  if (!found) {
    return NextResponse.json({ ok: false, error: 'Khong tim thay order.' }, { status: 404 });
  }

  const intent = expireIntentIfNeeded(found);

  return NextResponse.json({
    ok: true,
    orderId: intent.id,
    status: intent.status,
    email: intent.email,
    walletAddress: intent.walletAddress ?? null,
    amountMinor: intent.amountMinor,
    receiverAddress: intent.receiverAddress,
    txHash: intent.txHash ?? null,
    verifiedAt: intent.verifiedAt ?? null,
    expiresAt: intent.expiresAt,
    lagoCustomerId: intent.lagoCustomerId ?? null,
    lagoSubscriptionId: intent.lagoSubscriptionId ?? null,
    lagoPaymentId: intent.lagoPaymentId ?? null,
    lagoSyncedAt: intent.lagoSyncedAt ?? null,
    lagoSyncError: intent.lagoSyncError ?? null,
  });
}
