'use client';

import { useState, useEffect, useCallback } from 'react';

interface Subscription {
  subscription_id: string;
  status: string;
  product_id: string;
  created_at: string;
  next_billing_date?: string;
  plan?: string;
}

interface Payment {
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function PayPortalPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const loadPortal = useCallback(async (cid: string) => {
    const [subRes, payRes] = await Promise.all([
      fetch(`/api/customer/subscriptions?customer_id=${cid}`),
      fetch(`/api/customer/payments?customer_id=${cid}`),
    ]);
    const subData = await subRes.json() as { subscriptions?: { items?: Subscription[] } };
    const payData = await payRes.json() as { payments?: { items?: Payment[] } };
    setSubscriptions(subData.subscriptions?.items ?? []);
    setPayments(payData.payments?.items ?? []);
  }, []);

  useEffect(() => {
    if (customerId) {
      loadPortal(customerId).catch(console.error);
    }
  }, [customerId, loadPortal]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const emailTrimmed = email.trim();
    if (!emailTrimmed) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/customer?email=${encodeURIComponent(emailTrimmed)}`);
      const data = await res.json() as { customer?: { customer_id: string } | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Lookup failed');
      if (!data.customer) {
        setError('Không tìm thấy tài khoản với email này.');
        return;
      }
      setCustomerId(data.customer.customer_id);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  const statusColor = (s: string) =>
    s === 'active' ? '#34E67E' : s === 'cancelled' || s === 'expired' ? '#FF52F1' : '#F59E0B';

  const card: React.CSSProperties = {
    background: '#1A1D24',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '20px 24px',
    marginBottom: 12,
  };

  return (
    <div style={{ background: '#0D0F12', minHeight: '100vh', padding: '80px 24px 60px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <a href="https://toilabap.com" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, display: 'inline-block', marginBottom: 32 }}>
          ← Toilabap.com
        </a>

        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Quản lý Subscription
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 36 }}>
          Nhập email để xem trạng thái và lịch sử thanh toán.
        </p>

        {!submitted ? (
          <form onSubmit={(e) => { void handleLookup(e); }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                flex: 1, minWidth: 220,
                background: '#21262F', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '11px 16px', color: '#fff',
                fontSize: 14, outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#3CD3FE', color: '#0D0F12',
                border: 'none', borderRadius: 8,
                padding: '11px 24px', fontWeight: 700, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Đang tìm...' : 'Tra cứu →'}
            </button>
            {error && <p style={{ color: '#FF52F1', fontSize: 13, width: '100%', margin: 0 }}>{error}</p>}
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                Đang xem: <strong style={{ color: '#3CD3FE' }}>{email}</strong>
              </p>
              <button
                onClick={() => { setSubmitted(false); setCustomerId(null); setSubscriptions([]); setPayments([]); setEmail(''); }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
              >
                Đổi email
              </button>
            </div>

            {/* Subscriptions */}
            <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
              Gói đăng ký
            </h2>
            {subscriptions.length === 0 ? (
              <div style={{ ...card, color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', padding: '32px 24px' }}>
                Không có subscription nào.{' '}
                <a href="https://toilabap.com/pricing.html" style={{ color: '#3CD3FE' }}>Đăng ký ngay →</a>
              </div>
            ) : subscriptions.map(sub => (
              <div key={sub.subscription_id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>
                    {sub.plan ?? sub.product_id ?? 'Subscription'}
                  </span>
                  <span style={{
                    background: statusColor(sub.status) + '1a',
                    border: `1px solid ${statusColor(sub.status)}44`,
                    color: statusColor(sub.status),
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {sub.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                  ID: {sub.subscription_id}<br />
                  Tạo: {new Date(sub.created_at).toLocaleDateString('vi-VN')}<br />
                  {sub.next_billing_date && <>Gia hạn tiếp: {new Date(sub.next_billing_date).toLocaleDateString('vi-VN')}</>}
                </div>
              </div>
            ))}

            {/* Payment history */}
            <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '28px 0 14px' }}>
              Lịch sử thanh toán
            </h2>
            {payments.length === 0 ? (
              <div style={{ ...card, color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', padding: '32px 24px' }}>
                Chưa có giao dịch nào.
              </div>
            ) : payments.map(pay => (
              <div key={pay.payment_id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                    {pay.currency?.toUpperCase()} {(pay.amount / 100).toLocaleString('en-US')}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    {new Date(pay.created_at).toLocaleDateString('vi-VN')} · {pay.payment_id}
                  </div>
                </div>
                <span style={{
                  background: statusColor(pay.status) + '1a',
                  border: `1px solid ${statusColor(pay.status)}44`,
                  color: statusColor(pay.status),
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                  textTransform: 'uppercase',
                }}>
                  {pay.status}
                </span>
              </div>
            ))}

            <div style={{ marginTop: 32, padding: '16px 20px', background: 'rgba(60,211,254,0.05)', border: '1px solid rgba(60,211,254,0.15)', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Cần hỗ trợ hoặc huỷ subscription?{' '}
              <a href="https://t.me/Jbap1989" style={{ color: '#3CD3FE' }}>Liên hệ Telegram →</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
