'use client';

import { useState, useEffect, useCallback } from 'react';

interface Payment {
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  customer?: { email?: string; name?: string; customer_id?: string };
  metadata?: Record<string, string>;
}

interface Subscription {
  subscription_id: string;
  status: string;
  product_id: string;
  created_at: string;
  next_billing_date?: string;
  customer?: { email?: string; name?: string; customer_id?: string };
}

interface Summary {
  totalRevenue: number;
  totalPayments: number;
  activeSubscriptions: number;
}

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? '';

export default function PayAdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ payments: Payment[]; subscriptions: Subscription[]; summary: Summary } | null>(null);
  const [tab, setTab] = useState<'overview' | 'payments' | 'subscriptions'>('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'pay.toilabap.com | Admin Portal';
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dodo-payments');
      if (!res.ok) throw new Error('Failed to fetch admin data');
      const json = await res.json() as typeof data;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) void fetchData();
  }, [authed, fetchData]);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    const correctKey = ADMIN_KEY || process.env.NEXT_PUBLIC_PAY_ADMIN_PASS || 'toilabap-admin-2026';
    if (password === correctKey) {
      setAuthed(true);
      setAuthError('');
    } else {
      setAuthError('Mật khẩu không đúng.');
    }
  }

  const statusColor = (s: string) =>
    s === 'active' || s === 'succeeded' || s === 'completed' ? '#34E67E'
    : s === 'cancelled' || s === 'expired' || s === 'failed' ? '#FF52F1'
    : '#F59E0B';

  const statCard = (label: string, value: string | number, sub?: string) => (
    <div style={{
      background: '#1A1D24', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '20px 24px', flex: 1, minWidth: 160,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</div>
      {sub && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  if (!authed) {
    return (
      <div style={{ background: '#0D0F12', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        <div style={{ background: '#1A1D24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '40px 36px', maxWidth: 360, width: '100%', margin: '0 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Admin Portal</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 28 }}>pay.toilabap.com/admin</p>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Admin password"
              required
              style={{
                background: '#21262F', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '11px 16px', color: '#fff',
                fontSize: 14, outline: 'none', textAlign: 'center',
              }}
            />
            {authError && <p style={{ color: '#FF52F1', fontSize: 13, margin: 0 }}>{authError}</p>}
            <button type="submit" style={{ background: '#3CD3FE', color: '#0D0F12', border: 'none', borderRadius: 8, padding: '11px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Đăng nhập →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0D0F12', minHeight: '100vh', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Toilabap</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>/</span>
          <span style={{ color: '#3CD3FE', fontSize: 13, fontWeight: 600 }}>Pay Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => void fetchData()} disabled={loading} style={{ background: 'rgba(60,211,254,0.1)', border: '1px solid rgba(60,211,254,0.25)', borderRadius: 6, color: '#3CD3FE', padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {loading ? '...' : '↻ Refresh'}
          </button>
          <button onClick={() => { setAuthed(false); setPassword(''); setData(null); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'rgba(255,255,255,0.4)', padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 32px 60px' }}>
        {error && <div style={{ background: 'rgba(255,82,241,0.1)', border: '1px solid rgba(255,82,241,0.25)', borderRadius: 8, padding: '12px 16px', color: '#FF52F1', fontSize: 13, marginBottom: 24 }}>{error}</div>}

        {/* Stats row */}
        {data && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 32 }}>
            {statCard('Tổng doanh thu', `$${(data.summary.totalRevenue / 100).toLocaleString('en-US')}`, 'Đã thu thành công')}
            {statCard('Tổng giao dịch', data.summary.totalPayments)}
            {statCard('Subscription active', data.summary.activeSubscriptions)}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {(['overview', 'payments', 'subscriptions'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? '#3CD3FE' : 'transparent',
                border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.12)',
                color: tab === t ? '#0D0F12' : 'rgba(255,255,255,0.5)',
                borderRadius: 6, padding: '8px 18px',
                cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 500,
                textTransform: 'capitalize',
              }}
            >
              {t === 'overview' ? 'Tổng quan' : t === 'payments' ? 'Giao dịch' : 'Subscriptions'}
            </button>
          ))}
        </div>

        {loading && !data && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '60px 0', fontSize: 14 }}>Đang tải dữ liệu...</div>
        )}

        {data && tab === 'payments' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Payment ID', 'Email', 'Plan', 'Số tiền', 'Trạng thái', 'Ngày'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.payments.map(pay => (
                  <tr key={pay.payment_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '11px 14px', color: '#3CD3FE', fontFamily: 'monospace', fontSize: 12 }}>{pay.payment_id}</td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.7)' }}>{pay.customer?.email ?? '—'}</td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.5)' }}>{pay.metadata?.plan ?? '—'}</td>
                    <td style={{ padding: '11px 14px', color: '#fff', fontWeight: 700 }}>
                      {pay.currency?.toUpperCase()} {(pay.amount / 100).toLocaleString('en-US')}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ color: statusColor(pay.status), fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                        {pay.status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      {new Date(pay.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.payments.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px 0', fontSize: 14 }}>Chưa có giao dịch nào.</div>
            )}
          </div>
        )}

        {data && tab === 'subscriptions' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Subscription ID', 'Email', 'Product', 'Trạng thái', 'Gia hạn tiếp', 'Ngày tạo'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map(sub => (
                  <tr key={sub.subscription_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '11px 14px', color: '#3CD3FE', fontFamily: 'monospace', fontSize: 12 }}>{sub.subscription_id}</td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.7)' }}>{sub.customer?.email ?? '—'}</td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.5)' }}>{sub.product_id}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ color: statusColor(sub.status), fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      {new Date(sub.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.subscriptions.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px 0', fontSize: 14 }}>Chưa có subscription nào.</div>
            )}
          </div>
        )}

        {data && tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Recent payments */}
            <div style={{ background: '#1A1D24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '20px 24px' }}>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Giao dịch gần đây</h3>
              {data.payments.slice(0, 8).map(pay => (
                <div key={pay.payment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{pay.customer?.email ?? pay.payment_id}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{new Date(pay.created_at).toLocaleDateString('vi-VN')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>${(pay.amount / 100).toLocaleString('en-US')}</div>
                    <div style={{ color: statusColor(pay.status), fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>{pay.status}</div>
                  </div>
                </div>
              ))}
              {data.payments.length === 0 && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Chưa có giao dịch.</p>}
            </div>

            {/* Active subscriptions */}
            <div style={{ background: '#1A1D24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '20px 24px' }}>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Subscriptions active</h3>
              {data.subscriptions.filter(s => s.status === 'active').slice(0, 8).map(sub => (
                <div key={sub.subscription_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{sub.customer?.email ?? sub.subscription_id}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{sub.product_id}</div>
                  </div>
                  <div style={{ color: '#34E67E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>ACTIVE</div>
                </div>
              ))}
              {data.subscriptions.filter(s => s.status === 'active').length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Chưa có subscription active.</p>
              )}
            </div>
          </div>
        )}

        {/* Links */}
        <div style={{ marginTop: 40, padding: '16px 20px', background: 'rgba(60,211,254,0.04)', border: '1px solid rgba(60,211,254,0.12)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          🔗 Dodo Payments Dashboard:{' '}
          <a href="https://app.dodopayments.com" target="_blank" rel="noopener noreferrer" style={{ color: '#3CD3FE' }}>app.dodopayments.com</a>
          {' · '}
          Webhook:{' '}
          <code style={{ fontFamily: 'monospace', color: '#3CD3FE' }}>https://pay.toilabap.com/webhook</code>
        </div>
      </div>
    </div>
  );
}
