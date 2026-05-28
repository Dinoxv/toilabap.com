# Ghost-based Intro Rebuild for toilabap.com

Muc tieu: dua intro va pricing vao Ghost de quan ly noi dung qua giao dien admin, khong sua tay file HTML lon.

## Cau truc

- `toilabap-theme/`: Ghost theme
- `routes.yaml`: mapping route pricing
- `docker-compose.yml`: chay Ghost local
- `content/`: du lieu Ghost (tu tao sau lan chay dau)

## Chay local

1. Vao thu muc:

   `cd /root/hyperscalper/intro/ghost`

2. Khoi dong Ghost:

   `docker compose up -d`

3. Mo:

- Site: http://localhost:2368
- Admin: http://localhost:2368/ghost

4. Trong Admin:

- Settings -> Design -> Active theme: chon `toilabap-theme`
- Settings -> Labs -> Routes: upload `routes.yaml`
- Tao page slug `pricing` de map vao template `page-pricing.hbs`

## Mapping domain production toilabap.com

- `toilabap.com` -> reverse proxy den Ghost
- Dat bien moi truong `url=https://toilabap.com`
- SSL qua Caddy/Nginx/Cloudflare

## Workflow quan tri

1. Sua landing sections bang page content trong Ghost editor
2. Tao bai viet tu dashboard
3. Sua menu tai Settings -> Navigation
4. Theme giu nguyen layout, admin chi quan ly noi dung

## Migrate noi dung tu HTML cu sang Ghost

Da co script migrate tai `scripts/migrate-static-to-ghost.mjs`.

1. Tao payload dry-run (pages + posts + navigation):

   `node scripts/migrate-static-to-ghost.mjs`

   Ket qua duoc ghi vao `migration-output/` gom:
- `pages.json`
- `posts.json`
- `navigation.json`
- `html/*.html`

2. Apply truc tiep vao Ghost Admin API:

   `GHOST_ADMIN_URL=http://localhost:2368 GHOST_ADMIN_KEY=<admin_key> node scripts/migrate-static-to-ghost.mjs --apply`

Ghi chu:
- Script tao/ghi de 2 page: `landing`, `pricing`.
- Script tao/ghi de 2 post archive o trang thai `draft`: `landing-v2-archive`, `landing-og-archive`.
- Navigation duoc cap nhat de gom `Trang chu`, `Bang gia`, `Landing`, `Blog`.

## Dong bo tai san cu

Neu can dung lai media hien co trong `/root/hyperscalper/intro/assets`, copy vao:

`/root/hyperscalper/intro/ghost/content/images`

hoac chinh duong dan asset trong theme.
