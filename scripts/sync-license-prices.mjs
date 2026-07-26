/**
 * Copia SSoT de precios: src/lib/license-prices.json → functions/lib/
 * Uso: node scripts/sync-license-prices.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src/lib/license-prices.json");
const dest = path.join(root, "functions/lib/license-prices.json");
fs.copyFileSync(src, dest);
console.log("synced", dest);
