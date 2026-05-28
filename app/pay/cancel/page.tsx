import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thanh toán bị huỷ — Toilabap.com',
};

export default function PayCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0F12', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <div style={{
        background: '#1A1D24',
        border: '1px solid rgba(255,82,241,0.2)',
        borderRadius: 12,
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        margin: '0 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,82,241,0.1)',
          border: '2px solid rgba(255,82,241,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28,
        }}>
          ×
        </div>

        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Thanh toán bị huỷ
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.65, marginBottom: 32 }}>
          Bạn đã huỷ quá trình thanh toán. Không có khoản phí nào được tính.<br />
          Bạn có thể thử lại bất cứ lúc nào.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://toilabap.com/pricing.html"
            style={{
              background: '#3CD3FE', color: '#0D0F12',
              padding: '11px 24px', borderRadius: 8,
              textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}
          >
            Xem lại bảng giá →
          </a>
          <a
            href="https://t.me/Jbap1989"
            style={{
              background: 'transparent', color: '#fff',
              border: '1px solid rgba(255,255,255,0.18)',
              padding: '11px 24px', borderRadius: 8,
              textDecoration: 'none', fontWeight: 600, fontSize: 14,
            }}
          >
            💬 Hỏi tư vấn
          </a>
        </div>
      </div>
    </div>
  );
}
