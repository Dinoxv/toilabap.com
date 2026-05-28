import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';

export const runtime = 'nodejs';

// Webhook events from Dodo Payments
// See: https://docs.dodopayments.com/api-reference/webhooks

const WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify webhook signature
    if (WEBHOOK_SECRET) {
      const webhookId = req.headers.get('webhook-id') ?? '';
      const webhookTimestamp = req.headers.get('webhook-timestamp') ?? '';
      const webhookSignature = req.headers.get('webhook-signature') ?? '';

      if (!webhookId || !webhookTimestamp || !webhookSignature) {
        return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 });
      }

      try {
        const wh = new Webhook(btoa(WEBHOOK_SECRET));
        wh.verify(rawBody, {
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
          'webhook-signature': webhookSignature,
        });
      } catch {
        console.error('[dodo/webhook] Signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody) as {
      type: string;
      data: Record<string, unknown>;
    };

    console.log('[dodo/webhook] Event received:', event.type);

    switch (event.type) {
      case 'payment.succeeded':
      case 'payment.completed': {
        const payment = event.data;
        console.log('[dodo/webhook] Payment succeeded:', payment['payment_id']);
        // TODO: Activate user subscription in your database
        // await activateSubscription(payment);
        break;
      }

      case 'payment.failed': {
        const payment = event.data;
        console.log('[dodo/webhook] Payment failed:', payment['payment_id']);
        // TODO: Notify user of payment failure
        break;
      }

      case 'subscription.active': {
        const sub = event.data;
        console.log('[dodo/webhook] Subscription activated:', sub['subscription_id']);
        // TODO: Update user subscription status in database
        // await updateSubscription(sub);
        break;
      }

      case 'subscription.on_hold':
      case 'subscription.paused': {
        const sub = event.data;
        console.log('[dodo/webhook] Subscription on hold:', sub['subscription_id']);
        // TODO: Pause user access
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.expired': {
        const sub = event.data;
        console.log('[dodo/webhook] Subscription cancelled/expired:', sub['subscription_id']);
        // TODO: Revoke user access
        break;
      }

      case 'subscription.renewed': {
        const sub = event.data;
        console.log('[dodo/webhook] Subscription renewed:', sub['subscription_id']);
        // TODO: Extend user subscription period
        break;
      }

      case 'refund.succeeded': {
        const refund = event.data;
        console.log('[dodo/webhook] Refund processed:', refund['refund_id']);
        break;
      }

      default:
        console.log('[dodo/webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    console.error('[dodo/webhook] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
