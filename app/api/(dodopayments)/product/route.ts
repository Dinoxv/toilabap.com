import { NextRequest, NextResponse } from 'next/server';
import { dodo } from '@/lib/dodopayments';

export const runtime = 'nodejs';

/** GET /api/product?id=prod_xxx — get single product */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

    const product = await dodo.products.retrieve(id);
    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Product lookup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
