type LagoRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
};

export type LagoPaymentSyncPayload = {
  externalCustomerId: string;
  email: string;
  walletAddress?: string;
  amountMinor: number;
  currency: string;
  externalReference: string;
  txHash: string;
  metadata?: Record<string, string>;
};

export type LagoPaymentSyncResult = {
  skipped: boolean;
  customerId?: string;
  paymentId?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function lagoEnabled(): boolean {
  return Boolean(String(process.env.LAGO_API_URL ?? '').trim() && String(process.env.LAGO_API_KEY ?? '').trim());
}

function lagoHeaders(): Record<string, string> {
  const key = String(process.env.LAGO_API_KEY ?? '').trim();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
}

async function lagoRequest<T>(options: LagoRequestOptions): Promise<T> {
  const baseUrl = String(process.env.LAGO_API_URL ?? '').trim();
  if (!baseUrl) {
    throw new Error('LAGO_API_URL is not configured');
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${options.path}`, {
    method: options.method ?? 'POST',
    headers: lagoHeaders(),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Lago API ${options.path} failed (${response.status}): ${text.slice(0, 400)}`);
  }

  return (await response.json()) as T;
}

function toExternalCustomerId(email: string): string {
  return email.trim().toLowerCase();
}

async function upsertCustomer(input: {
  externalCustomerId: string;
  email: string;
  walletAddress?: string;
}): Promise<string | undefined> {
  const payload = {
    customer: {
      external_customer_id: input.externalCustomerId,
      email: input.email,
      metadata: {
        wallet_address: input.walletAddress ?? '',
      },
    },
  };

  const createPath = String(process.env.LAGO_CUSTOMERS_CREATE_PATH ?? '/api/v1/customers').trim();
  const updatePathTemplate = String(process.env.LAGO_CUSTOMERS_UPDATE_PATH_TEMPLATE ?? '/api/v1/customers/{externalCustomerId}').trim();

  try {
    const created = await lagoRequest<{ customer?: { lago_id?: string; id?: string } }>({
      method: 'POST',
      path: createPath,
      body: payload,
    });
    return created.customer?.lago_id ?? created.customer?.id;
  } catch {
    const updatePath = updatePathTemplate.replace('{externalCustomerId}', encodeURIComponent(input.externalCustomerId));
    const updated = await lagoRequest<{ customer?: { lago_id?: string; id?: string } }>({
      method: 'PUT',
      path: updatePath,
      body: payload,
    });
    return updated.customer?.lago_id ?? updated.customer?.id;
  }
}

async function createManualPayment(input: LagoPaymentSyncPayload): Promise<string | undefined> {
  const path = String(process.env.LAGO_PAYMENTS_CREATE_PATH ?? '/api/v1/payments').trim();
  const body = {
    payment: {
      external_customer_id: input.externalCustomerId,
      amount_cents: input.amountMinor,
      currency: input.currency,
      payment_type: 'manual',
      reference: input.externalReference,
      metadata: {
        tx_hash: input.txHash,
        ...(input.metadata ?? {}),
      },
    },
  };

  const response = await lagoRequest<{ payment?: { lago_id?: string; id?: string } }>({
    method: 'POST',
    path,
    body,
  });

  return response.payment?.lago_id ?? response.payment?.id;
}

export async function syncManualPaymentToLago(payload: LagoPaymentSyncPayload): Promise<LagoPaymentSyncResult> {
  if (!lagoEnabled()) {
    return { skipped: true };
  }

  const customerId = await upsertCustomer({
    externalCustomerId: payload.externalCustomerId,
    email: payload.email,
    walletAddress: payload.walletAddress,
  });

  const paymentId = await createManualPayment(payload);
  return {
    skipped: false,
    customerId,
    paymentId,
  };
}

export function toLagoExternalCustomerId(email: string): string {
  return toExternalCustomerId(email);
}

export function isLagoConfigured(): boolean {
  return lagoEnabled();
}
