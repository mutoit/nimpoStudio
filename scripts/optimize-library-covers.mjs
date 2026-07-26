/**
 * Regenera portadas del catálogo R2 a miniaturas reales (~480px JPEG ~q0.82).
 * Uso (desde nimpo-studio/):
 *   node scripts/optimize-library-covers.mjs
 * Requiere CLOUDFLARE_API_TOKEN en .env y wrangler.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tmp = path.join(root, ".tmp-covers");
const BUCKET = "nimpo-library";
const CATALOG_KEY = "catalog/library.json";
const MAX_EDGE = 480;
const JPEG_Q = 80;

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

function wrangler(args) {
  const r = spawnSync("npx", ["wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    shell: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(`wrangler ${args.join(" ")}\n${r.stderr || r.stdout}`);
  }
  return r.stdout;
}

function r2Get(key, file) {
  wrangler(["r2", "object", "get", `${BUCKET}/${key}`, "--file", file, "--remote"]);
}

function r2Put(key, file, contentType) {
  // wrangler no acepta "; charset=..." en --content-type
  const ct = String(contentType || "application/octet-stream").split(";")[0].trim();
  wrangler([
    "r2",
    "object",
    "put",
    `${BUCKET}/${key}`,
    "--file",
    file,
    "--content-type",
    ct,
    "--remote",
  ]);
}

function publicUrl(key) {
  return `/api/media/${key}`;
}

function coverKeyFromUrl(url) {
  if (!url) return null;
  const s = String(url);
  const m = s.match(/library\/[^?#]+/);
  if (m) return m[0].replace(/^\/+/, "");
  if (s.startsWith("library/")) return s;
  return null;
}

async function main() {
  loadEnv();
  fs.mkdirSync(tmp, { recursive: true });

  // jimp: pure JS, no native build
  let Jimp;
  try {
    const require = createRequire(import.meta.url);
    Jimp = require("jimp");
  } catch {
    console.log("Installing jimp…");
    const inst = spawnSync("npm", ["install", "jimp@0.22.12", "--no-save", "--no-package-lock"], {
      cwd: root,
      encoding: "utf8",
      shell: true,
    });
    if (inst.status !== 0) throw new Error(inst.stderr || inst.stdout);
    const require = createRequire(import.meta.url);
    Jimp = require("jimp");
  }

  const catalogFile = path.join(tmp, "library.json");
  console.log("Downloading catalog…");
  r2Get(CATALOG_KEY, catalogFile);
  const items = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
  if (!Array.isArray(items)) throw new Error("catalog not array");

  let changed = 0;
  for (const item of items) {
    const slug = String(item.slug || item.id || "item");
    const key = coverKeyFromUrl(item.cover);
    if (!key) {
      console.log(`skip ${slug}: no cover`);
      continue;
    }

    const inFile = path.join(tmp, path.basename(key));
    console.log(`\n→ ${slug}`);
    console.log(`  get ${key}`);
    try {
      r2Get(key, inFile);
    } catch (e) {
      console.warn(`  FAIL get: ${e.message}`);
      continue;
    }

    const before = fs.statSync(inFile).size;
    const img = await Jimp.read(inFile);
    const w = img.getWidth();
    const h = img.getHeight();
    if (Math.max(w, h) > MAX_EDGE) {
      img.scaleToFit(MAX_EDGE, MAX_EDGE);
    }
    img.quality(JPEG_Q);

    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const outName = `${slug}-cover-t${MAX_EDGE}-${stamp}.jpg`;
    const outKey = `library/${slug}/${outName}`;
    const outFile = path.join(tmp, outName);
    await img.writeAsync(outFile);
    const after = fs.statSync(outFile).size;

    console.log(`  ${w}x${h} ${(before / 1024).toFixed(0)}KB → ${img.getWidth()}x${img.getHeight()} ${(after / 1024).toFixed(0)}KB`);
    if (after >= before * 0.95 && Math.max(w, h) <= MAX_EDGE) {
      console.log("  already small enough, keep");
      continue;
    }

    r2Put(outKey, outFile, "image/jpeg");
    item.cover = publicUrl(outKey);
    // thumb explícito por si más adelante hay cover hi-res
    item.thumb = publicUrl(outKey);
    item.updatedAt = new Date().toISOString();
    changed++;
    console.log(`  put ${outKey}`);
  }

  if (changed) {
    fs.writeFileSync(catalogFile, JSON.stringify(items, null, 2), "utf8");
    console.log(`\nUpdating catalog (${changed} covers)…`);
    r2Put(CATALOG_KEY, catalogFile, "application/json; charset=utf-8");
    console.log("Done.");
  } else {
    console.log("\nNo catalog changes.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
