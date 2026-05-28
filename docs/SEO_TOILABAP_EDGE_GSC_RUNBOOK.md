# SEO Edge + Google Search Console Runbook (toilabap.com)

## 1) Nginx baseline (apex domain)

Purpose: ensure `/robots.txt` and `/sitemap.xml` are served as real files on apex domain instead of falling back to landing HTML.

```nginx
server {
    server_name toilabap.com www.toilabap.com;

    root /root/hyperscalper/intro;
    index toilabap-landing.html;

    location ~* "^/(0x[a-f0-9]{40}|binance-apikey)(/.*)?$" {
        return 301 https://app.toilabap.com$request_uri;
    }

    location ~* \.(jpg|jpeg|png|gif|svg|webp|css|js|ico|woff|woff2|ttf|eot)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # SEO endpoints
    location = /robots.txt {
        default_type text/plain;
        try_files /robots.txt =404;
        add_header Cache-Control "public, max-age=300";
    }

    location = /sitemap.xml {
        default_type application/xml;
        try_files /sitemap.xml =404;
        add_header Cache-Control "public, max-age=300";
    }

    location / {
        try_files $uri $uri/ /toilabap-landing.html;
    }
}
```

Deployment commands:

```bash
nginx -t
systemctl reload nginx
```

## 2) Required static files on apex root

Place these files under `/root/hyperscalper/intro/`:

- `robots.txt`
- `sitemap.xml`

Current intended `robots.txt`:

```txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /admincp
Disallow: /pay/admin
Disallow: /pay/portal
Disallow: /pay/success
Disallow: /pay/cancel

Sitemap: https://toilabap.com/sitemap.xml
```

## 3) Cloudflare recommended settings

### 3.1 Caching rules

Create cache rule to avoid stale SEO endpoints:

- Expression: `(http.request.uri.path eq "/robots.txt") or (http.request.uri.path eq "/sitemap.xml")`
- Action:
  - Cache eligibility: Eligible
  - Edge TTL: 5 minutes (or Respect origin + short max-age)
  - Browser TTL: Respect origin

### 3.2 Redirect/transform conflict check

Ensure no Cloudflare Redirect Rule / Worker rewrites:

- `/robots.txt` -> `/`
- `/sitemap.xml` -> `/`
- Any wildcard redirect affecting those two paths

### 3.3 Managed robots/content signals note

Cloudflare can prepend managed content-signal lines into robots output. This is acceptable if final response still includes your `Sitemap:` line and valid directives.

## 4) Google Search Console final checklist

### 4.1 Pre-submit technical checks

Run before submitting sitemap:

```bash
curl -I https://toilabap.com/robots.txt
curl -I https://toilabap.com/sitemap.xml
curl -I https://toilabap.com/
curl -I https://toilabap.com/pricing.html
```

Expected:

- All return `200`
- `robots.txt` content type text/plain
- `sitemap.xml` content type text/xml or application/xml

### 4.2 Submit sitemap (manual in GSC)

1. Open Google Search Console property: `https://toilabap.com`.
2. Go to **Sitemaps**.
3. Submit: `https://toilabap.com/sitemap.xml`.
4. Wait for status `Success`.

### 4.3 URL inspection quick set

Inspect and request indexing for:

- `https://toilabap.com/`
- `https://toilabap.com/pricing.html`
- `https://toilabap.com/agency-agent`

Expected in inspection:

- URL is on Google (or queued)
- Crawl allowed: Yes
- Page fetch: Successful
- Canonical points to same URL

### 4.4 Index coverage monitoring (24-72h)

Check **Indexing > Pages**:

- Valid pages increasing
- No spikes in:
  - Crawled - currently not indexed
  - Duplicate without user-selected canonical
  - Blocked by robots.txt

## 5) Current validation snapshot

Validated on server:

- `https://toilabap.com/robots.txt` returns 200 and includes `Sitemap: https://toilabap.com/sitemap.xml`
- `https://toilabap.com/sitemap.xml` returns valid XML with 3 URLs
- Sitemap URLs respond 200:
  - `/`
  - `/pricing.html`
  - `/agency-agent`

## 6) Operations note

If SEO endpoint behavior regresses after future deployments:

1. Re-check nginx `location = /robots.txt` and `location = /sitemap.xml` blocks.
2. Re-check Cloudflare rules/workers for path rewrites.
3. Purge Cloudflare cache for `/robots.txt` and `/sitemap.xml`.
