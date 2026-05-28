/**
 * Dodo Payments client – toilabap.com billing integration
 * API key loaded from DODO_API_KEY env var (server-only)
 */
import DodoPayments from 'dodopayments';

if (!process.env.DODO_API_KEY) {
  throw new Error('Missing DODO_API_KEY environment variable');
}

export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY,
  environment: 'live_mode',
});

// ─── Plan IDs (set in Dodo Payments dashboard) ─────────────────────
// These are the product IDs created on Dodo Payments for each plan
export const PLAN_IDS: Record<string, { monthly: string; yearly: string }> = {
  community: {
    monthly: process.env.DODO_PRODUCT_COMMUNITY_MONTHLY ?? '',
    yearly: process.env.DODO_PRODUCT_COMMUNITY_YEARLY ?? '',
  },
  pro: {
    monthly: process.env.DODO_PRODUCT_PRO_MONTHLY ?? '',
    yearly: process.env.DODO_PRODUCT_PRO_YEARLY ?? '',
  },
  quant: {
    monthly: process.env.DODO_PRODUCT_QUANT_MONTHLY ?? '',
    yearly: process.env.DODO_PRODUCT_QUANT_YEARLY ?? '',
  },
};

// ─── Pricing table (mirrors pricing.html) ──────────────────────────
export const PLANS = [
  {
    id: 'community',
    title: 'Community',
    description: 'Bộ chỉ báo & alert cơ bản cho trader cá nhân.',
    monthlyPrice: '299',
    yearlyPrice: '2699',
    yearlyMonthly: '225',
    buttonText: 'Bắt đầu dùng thử',
    badge: undefined as string | undefined,
    highlight: false,
    features: [
      { name: 'Ritchi Indicator (Basic)', icon: 'check' },
      { name: 'Smart Alert – 5 cặp', icon: 'check' },
      { name: 'Trend Matrix (1 khung)', icon: 'check' },
      { name: '7 ngày dùng thử miễn phí', icon: 'check' },
    ],
  },
  {
    id: 'pro',
    title: 'Pro',
    description: 'Đầy đủ tính năng cho trader chuyên nghiệp.',
    monthlyPrice: '599',
    yearlyPrice: '5399',
    yearlyMonthly: '450',
    buttonText: 'Đăng ký Pro',
    badge: 'Phổ biến nhất',
    highlight: true,
    features: [
      { name: 'Tất cả tính năng Community', icon: 'check' },
      { name: 'Ritchi Indicator (Full)', icon: 'check' },
      { name: 'Smart Alert – không giới hạn', icon: 'check' },
      { name: 'Trend Matrix (5 khung)', icon: 'check' },
      { name: 'Backtest Lab', icon: 'check' },
      { name: 'Priority support', icon: 'check' },
    ],
  },
  {
    id: 'quant',
    title: 'Quant',
    description: 'Giải pháp toàn diện cho quỹ & desk chuyên nghiệp.',
    monthlyPrice: '999',
    yearlyPrice: '8999',
    yearlyMonthly: '750',
    buttonText: 'Liên hệ / Mua Quant',
    badge: undefined as string | undefined,
    highlight: false,
    features: [
      { name: 'Tất cả tính năng Pro', icon: 'check' },
      { name: 'API access', icon: 'check' },
      { name: 'Multi-account (10 sub)', icon: 'check' },
      { name: 'Quant dashboard', icon: 'check' },
      { name: 'Dedicated onboarding', icon: 'check' },
      { name: 'SLA 99.9%', icon: 'check' },
    ],
  },
];
