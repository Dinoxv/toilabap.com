import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thanh toán thành công — Toilabap.com',
  description: 'Cảm ơn bạn đã đăng ký Toilabap.com',
};

export default function PaySuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0F12', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <div style={{
        background: '#1A1D24',
        border: '1px solid rgba(52,230,126,0.3)',
        borderRadius: 12,
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        margin: '0 24px',
        textAlign: 'center',
      }}>
        {/* Success icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(52,230,126,0.12)',
          border: '2px solid rgba(52,230,126,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28,
        }}>
          ✓
        </div>

        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Thanh toán thành công!
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.65, marginBottom: 32 }}>
          Cảm ơn bạn đã đăng ký <strong style={{ color: '#3CD3FE' }}>Toilabap.com</strong>.<br />
          Tài khoản của bạn sẽ được kích hoạt trong vài phút. Kiểm tra email để nhận hướng dẫn truy cập.
        </p>

        <div style={{
          background: 'rgba(60,211,254,0.06)',
          border: '1px solid rgba(60,211,254,0.18)',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 28,
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.7,
        }}>
          📧 Email xác nhận đã được gửi.<br />
          ⏱ Kích hoạt tự động trong 5–10 phút.<br />
          💬 Cần hỗ trợ? <a href="https://t.me/Jbap1989" style={{ color: '#3CD3FE', textDecoration: 'none' }}>Telegram @Jbap1989</a>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://pay.toilabap.com"
            style={{
              background: '#3CD3FE', color: '#0D0F12',
              padding: '11px 24px', borderRadius: 8,
              textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}
          >
            Vào App →
          </a>
          <a
            href="/pay/portal"
            style={{
              background: 'transparent', color: '#fff',
              border: '1px solid rgba(255,255,255,0.18)',
              padding: '11px 24px', borderRadius: 8,
              textDecoration: 'none', fontWeight: 600, fontSize: 14,
            }}
          >
            Quản lý subscription
          </a>
        </div>
      </div>
    </div>
  );
}
