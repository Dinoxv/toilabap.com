import { NextRequest, NextResponse } from 'next/server';
import { dodo } from '@/lib/dodopayments';

export const runtime = 'nodejs';

/** GET /api/customer/payments?customer_id=cus_xxx */
export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get('customer_id');
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id query param required' }, { status: 400 });
    }

    const payments = await dodo.payments.list({ customer_id: customerId });
    return NextResponse.json({ payments });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payments lookup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
