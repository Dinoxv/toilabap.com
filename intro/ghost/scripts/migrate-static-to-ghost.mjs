#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ghostRoot = path.resolve(__dirname, "..");
const introRoot = path.resolve(ghostRoot, "..");
const outputRoot = path.join(ghostRoot, "migration-output");

const args = new Set(process.argv.slice(2));
const applyMode = args.has("--apply");

const assetBaseArg = process.argv.find((arg) => arg.startsWith("--asset-base="));
const assetBase = (assetBaseArg ? assetBaseArg.split("=").slice(1).join("=") : "https://intro.toilabap.com/")
  .replace(/\/$/, "");

const STATIC_SOURCES = [
  {
    kind: "page",
    sourceFile: "toilabap-landing.html",
    slug: "landing",
    status: "published",
    titleFallback: "Toilabap Landing"
  },
  {
    kind: "page",
    sourceFile: "pricing.html",
    slug: "pricing",
    status: "published",
    titleFallback: "Bang Gia Toilabap"
  },
  {
    kind: "post",
    sourceFile: "toilabap-landing-v2.html",
    slug: "landing-v2-archive",
    status: "draft",
    titleFallback: "Landing V2 Archive"
  },
  {
    kind: "post",
    sourceFile: "toilabap-landing-og.html",
    slug: "landing-og-archive",
    status: "draft",
    titleFallback: "Landing OG Archive"
  }
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBasicEntities(input) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripScripts(input) {
  return input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function rewriteAssetPaths(input) {
  return input
    .replace(/(["'])assets\//gi, `$1${assetBase}/assets/`)
    .replace(/(["'])\.\/assets\//gi, `$1${assetBase}/assets/`)
    .replace(/(["'])mpdf9mge-toilabap\.com-icon\.svg/gi, `$1${assetBase}/assets/toilabap.com-icon.png`);
}

function extractTitle(html, fallback) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? decodeBasicEntities(titleMatch[1]) : fallback;
}

function extractBody(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : html.trim();
}

async function readStaticEntry(entry) {
  const fullPath = path.join(introRoot, entry.sourceFile);
  const rawHtml = await fs.readFile(fullPath, "utf8");
  const title = extractTitle(rawHtml, entry.titleFallback);
  const body = rewriteAssetPaths(stripScripts(extractBody(rawHtml)));

  return {
    ...entry,
    title,
    html: body,
    sourcePath: fullPath
  };
}

function toGhostNavigation() {
  return [
    { label: "Trang chu", url: "/" },
    { label: "Bang gia", url: "/pricing/" },
    { label: "Landing", url: "/landing/" },
    { label: "Blog", url: "/" }
  ];
}

async function ensureOutputDir() {
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.mkdir(path.join(outputRoot, "html"), { recursive: true });
}

async function writeDryRunOutput(entries, navigation) {
  await ensureOutputDir();

  const pages = entries
    .filter((item) => item.kind === "page")
    .map((item) => ({
      title: item.title,
      slug: item.slug,
      status: item.status,
      sourceFile: item.sourceFile,
      htmlFile: `html/${item.slug}.html`
    }));

  const posts = entries
    .filter((item) => item.kind === "post")
    .map((item) => ({
      title: item.title,
      slug: item.slug,
      status: item.status,
      sourceFile: item.sourceFile,
      htmlFile: `html/${item.slug}.html`
    }));

  await fs.writeFile(path.join(outputRoot, "pages.json"), `${JSON.stringify(pages, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(outputRoot, "posts.json"), `${JSON.stringify(posts, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(outputRoot, "navigation.json"), `${JSON.stringify(navigation, null, 2)}\n`, "utf8");

  for (const entry of entries) {
    await fs.writeFile(path.join(outputRoot, "html", `${entry.slug}.html`), `${entry.html}\n`, "utf8");
  }
}

function buildAdminToken(adminKey) {
  const [id, secretHex] = adminKey.split(":");
  if (!id || !secretHex) {
    throw new Error("Invalid GHOST_ADMIN_KEY format. Expecting <id>:<secret>");
  }

  const header = {
    alg: "HS256",
    typ: "JWT",
    kid: id
  };

  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iat,
    exp: iat + 5 * 60,
    aud: "/admin/"
  };

  const headerEncoded = toBase64Url(JSON.stringify(header));
  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const unsigned = `${headerEncoded}.${payloadEncoded}`;

  const signature = crypto
    .createHmac("sha256", Buffer.from(secretHex, "hex"))
    .update(unsigned)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsigned}.${signature}`;
}

function createGhostClient(baseUrl, adminKey) {
  const apiRoot = `${baseUrl.replace(/\/$/, "")}/ghost/api/admin`;

  async function request(method, endpoint, body) {
    const token = buildAdminToken(adminKey);
    const response = await fetch(`${apiRoot}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Ghost ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ghost API ${method} ${endpoint} failed (${response.status}): ${text}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async function findBySlug(resource, slug) {
    const data = await request("GET", `/${resource}/?limit=1&filter=${encodeURIComponent(`slug:${slug}`)}`);
    const list = data?.[resource] ?? [];
    return list[0] ?? null;
  }

  async function upsert(resource, payload) {
    const existing = await findBySlug(resource, payload.slug);
    if (existing?.id) {
      const updateBody = {
        [resource]: [
          {
            id: existing.id,
            updated_at: existing.updated_at,
            ...payload
          }
        ]
      };
      await request("PUT", `/${resource}/${existing.id}/?source=html`, updateBody);
      return { action: "updated", slug: payload.slug };
    }

    await request("POST", `/${resource}/?source=html`, { [resource]: [payload] });
    return { action: "created", slug: payload.slug };
  }

  async function setNavigation(navigation) {
    try {
      await request("PUT", "/settings/navigation/", {
        navigation
      });
      return { updated: true, endpoint: "/settings/navigation/" };
    } catch (firstError) {
      const fallbackBody = {
        settings: [
          {
            key: "navigation",
            value: JSON.stringify(navigation)
          }
        ]
      };

      try {
        await request("PUT", "/settings/", fallbackBody);
        return { updated: true, endpoint: "/settings/" };
      } catch (secondError) {
        return {
          updated: false,
          error: `${firstError.message} | ${secondError.message}`
        };
      }
    }
  }

  return {
    upsertPage: (payload) => upsert("pages", payload),
    upsertPost: (payload) => upsert("posts", payload),
    setNavigation
  };
}

async function applyToGhost(entries, navigation) {
  const baseUrl = requireEnv("GHOST_ADMIN_URL");
  const adminKey = requireEnv("GHOST_ADMIN_KEY");
  const client = createGhostClient(baseUrl, adminKey);

  const logs = [];

  for (const entry of entries.filter((item) => item.kind === "page")) {
    const result = await client.upsertPage({
      title: entry.title,
      slug: entry.slug,
      html: entry.html,
      status: entry.status
    });
    logs.push(`page:${entry.slug}:${result.action}`);
  }

  for (const entry of entries.filter((item) => item.kind === "post")) {
    const result = await client.upsertPost({
      title: entry.title,
      slug: entry.slug,
      html: entry.html,
      status: entry.status
    });
    logs.push(`post:${entry.slug}:${result.action}`);
  }

  const navigationResult = await client.setNavigation(navigation);
  if (navigationResult.updated) {
    logs.push(`settings:navigation:updated:${navigationResult.endpoint}`);
  } else {
    logs.push(`settings:navigation:skipped:${navigationResult.error}`);
  }

  return logs;
}

async function main() {
  const entries = [];
  for (const source of STATIC_SOURCES) {
    entries.push(await readStaticEntry(source));
  }

  const navigation = toGhostNavigation();
  await writeDryRunOutput(entries, navigation);

  console.log(`Wrote migration payloads to: ${outputRoot}`);

  if (!applyMode) {
    console.log("Dry-run mode complete.");
    console.log("To apply into Ghost Admin API, run:");
    console.log("  GHOST_ADMIN_URL=http://localhost:2368 GHOST_ADMIN_KEY=<admin_key> node scripts/migrate-static-to-ghost.mjs --apply");
    return;
  }

  const logs = await applyToGhost(entries, navigation);
  console.log("Apply mode complete.");
  for (const line of logs) {
    console.log(`- ${line}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
