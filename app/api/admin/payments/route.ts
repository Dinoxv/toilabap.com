import { NextRequest, NextResponse } from 'next/server';

import { isAdminAuthorized } from '@/lib/server/admin-auth';
import { listIntents, type IntentStatus } from '@/lib/server/payment-intent-store';

export const runtime = 'nodejs';

const ALLOWED_STATUS: IntentStatus[] = ['created', 'pending', 'paid', 'failed', 'expired'];

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 100);
  const statusRaw = request.nextUrl.searchParams.get('status')?.trim() ?? '';
  const email = request.nextUrl.searchParams.get('email')?.trim() ?? '';

  const status = ALLOWED_STATUS.includes(statusRaw as IntentStatus)
    ? (statusRaw as IntentStatus)
    : undefined;

  const intents = listIntents({ limit, status, email: email || undefined });
  return NextResponse.json({ ok: true, count: intents.length, intents });
}
