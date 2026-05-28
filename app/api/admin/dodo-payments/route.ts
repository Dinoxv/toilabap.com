import { NextResponse } from 'next/server';
import { dodo } from '@/lib/dodopayments';

export const runtime = 'nodejs';

/** GET /api/admin/dodo-payments — list recent Dodo Payments data for admin dashboard */
export async function GET() {
  try {
    const [payments, subscriptions] = await Promise.all([
      dodo.payments.list({ page_size: 50 }),
      dodo.subscriptions.list({ page_size: 50 }),
    ]);

    const payItems = ((payments as unknown as Record<string, unknown>).items as Array<Record<string, unknown>>) ?? [];
    const subItems = ((subscriptions as unknown as Record<string, unknown>).items as Array<Record<string, unknown>>) ?? [];

    const totalRevenue = payItems
      .filter(p => p['status'] === 'succeeded' || p['status'] === 'completed')
      .reduce((acc, p) => acc + Number(p['amount'] ?? 0), 0);

    const activeSubscriptions = subItems.filter(s => s['status'] === 'active').length;

    return NextResponse.json({
      payments: payItems,
      subscriptions: subItems,
      summary: {
        totalRevenue,
        totalPayments: payItems.length,
        activeSubscriptions,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Admin data fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
