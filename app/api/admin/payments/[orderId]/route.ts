import { NextRequest, NextResponse } from 'next/server';

import { isAdminAuthorized } from '@/lib/server/admin-auth';
import { getIntentById, type IntentStatus, updateIntent } from '@/lib/server/payment-intent-store';

export const runtime = 'nodejs';

type UpdateBody = {
  status?: IntentStatus;
  txHash?: string | null;
};

const ALLOWED_STATUS: IntentStatus[] = ['created', 'pending', 'paid', 'failed', 'expired'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;
  const order = getIntentById(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  }

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const status = body?.status;
  if (!status || !ALLOWED_STATUS.includes(status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
  }

  const txHashRaw = String(body?.txHash ?? '').trim();
  const shouldSetVerifiedAt = status === 'paid';

  const updated = updateIntent(orderId, {
    status,
    txHash: txHashRaw || undefined,
    verifiedAt: shouldSetVerifiedAt ? new Date().toISOString() : order.verifiedAt,
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: 'Failed to update order' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, intent: updated });
}
