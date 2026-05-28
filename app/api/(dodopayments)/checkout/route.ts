import { NextRequest, NextResponse } from 'next/server';
import { dodo, PLAN_IDS } from '@/lib/dodopayments';

export const runtime = 'nodejs';

const ALLOWED_ORIGINS = new Set([
  'https://toilabap.com',
  'https://www.toilabap.com',
  'https://pay.toilabap.com',
]);

function applyCors(res: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  res.headers.set('Vary', 'Origin');
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return applyCors(new NextResponse(null, { status: 204 }), origin);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  try {
    const body = await req.json();
    const { email, plan, billing } = body as {
      email?: string;
      plan?: string;
      billing?: 'monthly' | 'yearly';
    };

    if (!email || !plan || !billing) {
      return applyCors(
        NextResponse.json({ error: 'Missing required fields: email, plan, billing' }, { status: 400 }),
        origin,
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return applyCors(NextResponse.json({ error: 'Invalid email address' }, { status: 400 }), origin);
    }

    const planIds = PLAN_IDS[plan];
    if (!planIds) {
      return applyCors(
        NextResponse.json({ error: 'Invalid plan. Choose: community, pro, quant' }, { status: 400 }),
        origin,
      );
    }

    const productId = billing === 'yearly' ? planIds.yearly : planIds.monthly;
    if (!productId) {
      return applyCors(
        NextResponse.json(
          { error: `Product ID for ${plan}/${billing} not configured. Set DODO_PRODUCT_${plan.toUpperCase()}_${billing.toUpperCase()} env var.` },
          { status: 500 }
        ),
        origin,
      );
    }

    const requestOrigin = origin || 'https://toilabap.com';
    const successUrl = `${requestOrigin.includes('toilabap') ? 'https://app.toilabap.com' : requestOrigin}/pay/success?session_id={CHECKOUT_SESSION_ID}`;

    const checkout = await dodo.payments.create({
      billing: {
        city: '',
        country: 'VN',
        state: '',
        street: '',
        zipcode: '',
      },
      customer: {
        email,
        name: email.split('@')[0],
      },
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        },
      ],
      payment_link: true,
      return_url: successUrl,
      metadata: {
        plan,
        billing,
        source: 'pricing_page',
      },
    });

    const result = checkout as unknown as Record<string, unknown>;
    return applyCors(
      NextResponse.json({
        ok: true,
        checkoutUrl: result['payment_link'] ?? result['url'],
        paymentId: result['payment_id'],
      }),
      origin,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout creation failed';
    console.error('[dodo/checkout]', message);
    return applyCors(NextResponse.json({ error: message }, { status: 500 }), origin);
  }
}
