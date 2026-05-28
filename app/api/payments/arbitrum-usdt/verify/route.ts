import { NextRequest, NextResponse } from 'next/server';
import { isAddress, isHash, type Address, type Hex } from 'viem';

import { verifyArbitrumUsdtTransfer } from '@/lib/server/arbitrum-usdt';
import { syncManualPaymentToLago, toLagoExternalCustomerId } from '@/lib/server/lago';
import { expireIntentIfNeeded, getIntentById, updateIntent } from '@/lib/server/payment-intent-store';

export const runtime = 'nodejs';

type VerifyBody = {
  orderId?: string;
  txHash?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyBody;
    const orderId = String(body?.orderId ?? '').trim();
    const txHash = String(body?.txHash ?? '').trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: 'Thieu orderId.' }, { status: 400 });
    }

    if (!isHash(txHash)) {
      return NextResponse.json({ ok: false, error: 'txHash khong hop le.' }, { status: 400 });
    }

    const existingIntent = getIntentById(orderId);
    if (!existingIntent) {
      return NextResponse.json({ ok: false, error: 'Khong tim thay order.' }, { status: 404 });
    }

    const intent = expireIntentIfNeeded(existingIntent);
    if (intent.status === 'expired') {
      return NextResponse.json({ ok: false, error: 'Order da het han.' }, { status: 400 });
    }

    if (intent.status === 'paid') {
      return NextResponse.json({ ok: true, status: 'paid', orderId: intent.id, txHash: intent.txHash ?? null });
    }

    if (!isAddress(intent.receiverAddress)) {
      return NextResponse.json({ ok: false, error: 'Dia chi nhan tien tren server khong hop le.' }, { status: 500 });
    }

    const rpcUrl = String(process.env.ARBITRUM_RPC_URL ?? 'https://arb1.arbitrum.io/rpc').trim();
    const requiredConfirmations = Number(process.env.ARBITRUM_REQUIRED_CONFIRMATIONS ?? 2);

    const result = await verifyArbitrumUsdtTransfer({
      txHash: txHash as Hex,
      expectedTo: intent.receiverAddress as Address,
      minAmountMinor: BigInt(intent.amountMinor),
      requiredConfirmations: Number.isFinite(requiredConfirmations) ? requiredConfirmations : 2,
      rpcUrl,
    });

    if (result.state === 'pending') {
      const updated = updateIntent(intent.id, {
        status: 'pending',
        txHash,
      });
      return NextResponse.json({
        ok: true,
        status: updated?.status ?? 'pending',
        orderId: intent.id,
        txHash,
        reason: result.reason,
        confirmations: result.confirmations ?? 0,
        requiredConfirmations: result.requiredConfirmations ?? 0,
      });
    }

    if (result.state === 'failed') {
      const updated = updateIntent(intent.id, {
        status: 'failed',
        txHash,
      });
      return NextResponse.json({
        ok: false,
        status: updated?.status ?? 'failed',
        orderId: intent.id,
        txHash,
        reason: result.reason,
      });
    }

    const updated = updateIntent(intent.id, {
      status: 'paid',
      txHash,
      txFrom: result.txFrom,
      verifiedAt: new Date().toISOString(),
      paidAmountMinor: Number(result.amountMinor),
    });

    let lagoSync: { ok: boolean; skipped?: boolean; error?: string } = { ok: true, skipped: true };
    try {
      const lagoResult = await syncManualPaymentToLago({
        externalCustomerId: toLagoExternalCustomerId(intent.email),
        email: intent.email,
        walletAddress: intent.walletAddress,
        amountMinor: intent.amountMinor,
        currency: intent.currency,
        externalReference: intent.id,
        txHash,
        metadata: {
          order_id: intent.id,
          plan: intent.plan,
          billing: intent.billing,
        },
      });

      updateIntent(intent.id, {
        lagoCustomerId: lagoResult.customerId,
        lagoPaymentId: lagoResult.paymentId,
        lagoSyncedAt: lagoResult.skipped ? undefined : new Date().toISOString(),
        lagoSyncError: undefined,
      });

      lagoSync = {
        ok: true,
        skipped: lagoResult.skipped,
      };
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : 'Unknown Lago sync error';
      updateIntent(intent.id, {
        lagoSyncError: message,
      });
      lagoSync = {
        ok: false,
        error: message,
      };
    }

    return NextResponse.json({
      ok: true,
      status: updated?.status ?? 'paid',
      orderId: intent.id,
      txHash,
      txFrom: result.txFrom,
      confirmations: result.confirmations,
      paidAmountUsdt: result.amountUsdt,
      lagoSync,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected server error',
      },
      { status: 500 }
    );
  }
}
