# Log Change GitHub - 2026-05-28

## Pham vi so sanh
- Nguon doi chieu: `origin/master` tu kho `https://github.com/Dinoxv/toilabap.com.git`
- Nguon cap nhat: ma nguon tren VPS tai thu muc `/root/hyperscalper`
- Trang thai doi chieu: cung commit nen `HEAD` va `origin/master` trung nhau (`a30706b`), khac biet nam o cac thay doi chua commit tren VPS.

## Tong hop thay doi
- 52 tep tracked da thay doi.
- 20+ tep va thu muc moi duoc bo sung (bao gom admin, thanh toan, billing webhook, trang pay, intro assets).
- Thong ke diff tracked: `1984 insertions`, `471 deletions`.

## Nhom thay doi chinh

### 1) Thuong hieu, SEO va metadata
- Dong bo thuong hieu sang `toilabap.com` va `app.toilabap.com` trong metadata, Open Graph, Twitter card.
- Cap nhat sitemap/robots va noi dung `llms.txt` de phuc vu indexing va AI crawler.
- Bo sung tai lieu van hanh SEO:
  - `docs/SEO_TOILABAP_EDGE_GSC_RUNBOOK.md`

### 2) Giao dien va trai nghiem giao dich
- Dieu chinh bo cuc cac trang chinh: symbol, bot, trades, watchlist, chart popup, multi-chart.
- Nang cap chart toolbar, chart controls, bang thong ke giao dich, trade row va sidepanel.
- Nang cap lon cho chart runtime:
  - `components/charting/LightweightChart.tsx`
- Cap nhat `AppShell`, `SettingsPanel`, `SymbolView`, `RightTradingPanel`.

### 3) Du lieu thoi gian thuc va scanner
- Cap nhat websocket cho Binance va Hyperliquid.
- Dieu chinh scanner va trend matrix:
  - `lib/services/scanner.service.ts`
  - `lib/trend-matrix.ts`
- Bo sung cap nhat store trang thai ket noi websocket:
  - `stores/useWebSocketStatusStore.ts`

### 4) Nhanh quan tri va thanh toan moi
- Bo sung nhom trang/duong dan quan tri:
  - `app/admin/*`
  - `app/admincp/*`
- Bo sung API payment + webhook:
  - `app/api/(dodopayments)/*`
  - `app/api/admin/*`
  - `app/api/payments/arbitrum-usdt/*`
  - `app/api/billing/lago/webhook/route.ts`
  - `app/webhook/route.ts`
- Bo sung cac trang thanh toan:
  - `app/pay/success/page.tsx`
  - `app/pay/cancel/page.tsx`
  - `app/pay/portal/page.tsx`
  - `app/pay/admin/*`
- Bo sung service backend lien quan:
  - `lib/dodopayments.ts`
  - `lib/server/lago.ts`
  - `lib/server/arbitrum-usdt.ts`
  - `lib/server/payment-intent-store.ts`
  - `lib/server/admin-auth.ts`
- Bo sung tai lieu tich hop billing:
  - `docs/LAGO_INTEGRATION.md`

### 5) Noi dung intro va tai nguyen thuong hieu
- Bo sung thu muc `intro/` gom landing static, media, robots/sitemap va bo migration Ghost.
- Bo sung icon thuong hieu PNG:
  - `public/branding/toilabap.com-icon.png`

### 6) Quoc te hoa va cau hinh
- Cap nhat goi ngon ngu:
  - `lib/i18n/en.ts`
  - `lib/i18n/vi.ts`
  - `lib/i18n/zh.ts`
- Dieu chinh cau hinh he thong:
  - `next.config.ts`
  - `package.json`
  - `package-lock.json`

### 7) Tep bi xoa
- Xoa tep:
  - `RESTORE_v2.1.md`

## Tep runtime tam thoi (khong nen dua vao commit chinh)
- `data/bot.db-shm`
- `data/bot.db-wal`
- `intro/ghost/content/data/ghost.db`
- `intro/ghost/content/logs/*`

## Ghi chu de dang len GitHub (goi y mo ta PR/commit)
- Rebrand to Toilabap app domain and metadata across app shell and landing.
- Add payment and billing integrations (DodoPayments, Arbitrum USDT, Lago webhook).
- Introduce admin and payment portal routes for operations and subscription flow.
- Upgrade chart runtime, scanner, and websocket state handling for live trading UX.
- Add SEO runbook and intro landing assets for growth and onboarding.
