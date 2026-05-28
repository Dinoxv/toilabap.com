'use client';

import { useEffect, useMemo, useState } from 'react';

type IntentStatus = 'created' | 'pending' | 'paid' | 'failed' | 'expired';

type PaymentIntent = {
  id: string;
  email: string;
  plan: string;
  billing: string;
  amountMinor: number;
  currency: string;
  network: string;
  receiverAddress: string;
  status: IntentStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  txHash?: string;
  txFrom?: string;
  verifiedAt?: string;
};

const STATUS_OPTIONS: IntentStatus[] = ['created', 'pending', 'paid', 'failed', 'expired'];

function formatUsdt(minor: number): string {
  return (minor / 1_000000).toFixed(2);
}

function maskHash(value?: string): string {
  if (!value) {
    return '-';
  }
  if (value.length < 14) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function AdminPaymentPage() {
  const [token, setToken] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IntentStatus>('all');
  const [emailFilter, setEmailFilter] = useState('');
  const [items, setItems] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('admin_cp_key') ?? '';
    if (saved) {
      setToken(saved);
    }
  }, []);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token.trim()}` }),
    [token]
  );

  async function loadData() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const params = new URLSearchParams({ limit: '200' });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (emailFilter.trim()) {
        params.set('email', emailFilter.trim());
      }

      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; intents?: PaymentIntent[] };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Khong tai duoc danh sach thanh toan');
      }

      setItems(data.intents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Loi khong xac dinh');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, status: IntentStatus) {
    setError('');
    setNotice('');

    try {
      const res = await fetch(`/api/admin/payments/${orderId}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Cap nhat that bai');
      }

      setNotice(`Da cap nhat ${orderId.slice(0, 8)}... -> ${status}`);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cap nhat that bai');
    }
  }

  function handleSaveKey() {
    window.localStorage.setItem('admin_cp_key', token.trim());
    setNotice('Da luu ADMIN_CP_KEY tren trinh duyet nay');
    setError('');
  }

  return (
    <main style={{ padding: '24px', color: '#fff', background: '#0f1117', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>AdminCP - Quan ly thanh toan</h1>

      <section
        style={{
          border: '1px solid #2a2f3a',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          background: '#171a22',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px' }}>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder='Nhap ADMIN_CP_KEY'
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #364054', background: '#11151d', color: '#fff' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | IntentStatus)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #364054', background: '#11151d', color: '#fff' }}
          >
            <option value='all'>Tat ca status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder='Loc theo email'
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #364054', background: '#11151d', color: '#fff' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSaveKey} style={{ padding: '10px 12px', borderRadius: '8px', border: 0, background: '#3b82f6', color: '#fff' }}>
              Luu key
            </button>
            <button onClick={loadData} disabled={loading} style={{ padding: '10px 12px', borderRadius: '8px', border: 0, background: '#22c55e', color: '#08120b' }}>
              {loading ? 'Dang tai...' : 'Tai du lieu'}
            </button>
          </div>
        </div>
      </section>

      {error ? <p style={{ color: '#f87171', marginBottom: '12px' }}>{error}</p> : null}
      {notice ? <p style={{ color: '#4ade80', marginBottom: '12px' }}>{notice}</p> : null}

      <section style={{ overflowX: 'auto', border: '1px solid #2a2f3a', borderRadius: '12px', background: '#171a22' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#11151d' }}>
              <th style={{ padding: '10px' }}>Order</th>
              <th style={{ padding: '10px' }}>Email</th>
              <th style={{ padding: '10px' }}>Plan</th>
              <th style={{ padding: '10px' }}>Amount</th>
              <th style={{ padding: '10px' }}>Status</th>
              <th style={{ padding: '10px' }}>Receiver</th>
              <th style={{ padding: '10px' }}>Tx Hash</th>
              <th style={{ padding: '10px' }}>Created</th>
              <th style={{ padding: '10px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderTop: '1px solid #2a2f3a' }}>
                <td style={{ padding: '10px' }}>{maskHash(item.id)}</td>
                <td style={{ padding: '10px' }}>{item.email}</td>
                <td style={{ padding: '10px' }}>{item.plan}/{item.billing}</td>
                <td style={{ padding: '10px' }}>${formatUsdt(item.amountMinor)} {item.currency}</td>
                <td style={{ padding: '10px' }}>{item.status}</td>
                <td style={{ padding: '10px' }}>{maskHash(item.receiverAddress)}</td>
                <td style={{ padding: '10px' }}>{maskHash(item.txHash)}</td>
                <td style={{ padding: '10px' }}>{new Date(item.createdAt).toLocaleString('vi-VN')}</td>
                <td style={{ padding: '10px' }}>
                  <select
                    value={item.status}
                    onChange={(e) => {
                      const next = e.target.value as IntentStatus;
                      if (next !== item.status) {
                        void updateStatus(item.id, next);
                      }
                    }}
                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #364054', background: '#11151d', color: '#fff' }}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '16px', color: '#94a3b8' }}>
                  Chua co du lieu.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
