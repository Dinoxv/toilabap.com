import { NextResponse } from 'next/server';
import { dodo } from '@/lib/dodopayments';

export const runtime = 'nodejs';

/** GET /api/products — list all active products */
export async function GET() {
  try {
    const products = await dodo.products.list();
    return NextResponse.json({ products });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Products lookup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
