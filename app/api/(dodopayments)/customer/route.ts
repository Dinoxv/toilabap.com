import { NextRequest, NextResponse } from 'next/server';
import { dodo } from '@/lib/dodopayments';

export const runtime = 'nodejs';

/** GET /api/customer?email=user@example.com  — get or create customer */
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'email query param required' }, { status: 400 });
    }

    // List customers and find by email
    const list = await dodo.customers.list({ email });
    const customers = ((list as unknown as Record<string, unknown>).items as Array<Record<string, unknown>>) ?? [];

    if (customers.length === 0) {
      return NextResponse.json({ customer: null });
    }

    return NextResponse.json({ customer: customers[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Customer lookup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/customer — create customer */
export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json() as { email?: string; name?: string };
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const customer = await dodo.customers.create({ email, name: name ?? email.split('@')[0] });
    return NextResponse.json({ customer });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Customer creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
