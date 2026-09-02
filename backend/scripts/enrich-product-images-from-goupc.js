/**
 * Busca imágenes en Go-UPC por barcode y las guarda en src/img/sistema/products,
 * actualizando primaryImageUrl en ERP_inventory_products.
 *
 * Solo toca productos con barcode y sin imagen usable (URL vacía o archivo inexistente).
 * Ante HTTP 429 (rate limit) reintenta con espera larga; no confunde 429 con "sin foto".
 *
 * Uso (desde AppsWeb/eddeli/backend):
 *   node scripts/enrich-product-images-from-goupc.js --dry-run --limit=5
 *   node scripts/enrich-product-images-from-goupc.js --limit=5 --delay=15000
 *   node scripts/enrich-product-images-from-goupc.js --limit=5 --offset=5
 *
 * Defaults seguros (otra IP / servidor): delay 15s, lotes de 5.
 * Entre lotes: esperá 10–15 min a mano. Si hay 429: pará 30–60 min.
 */
import "dotenv/config";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import { sequelize } from "../src/database/connection.js";
import { InventoryProduct } from "../src/models/Inventory.js";
import { slugify } from "../src/helpers/functions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_BASE = path.resolve(__dirname, "../src/img");
const DEST_FOLDER = "sistema/products";
const DEST_ABS = path.join(IMG_BASE, DEST_FOLDER);

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const offsetArg = process.argv.find((a) => a.startsWith("--offset="));
const delayArg = process.argv.find((a) => a.startsWith("--delay="));
const retriesArg = process.argv.find((a) => a.startsWith("--retries="));
const LIMIT = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 0) : Infinity;
const OFFSET = offsetArg ? Math.max(0, Number(offsetArg.split("=")[1]) || 0) : 0;
const DELAY_MS = delayArg ? Math.max(0, Number(delayArg.split("=")[1]) || 0) : 15_000;
const MAX_RETRIES = retriesArg ? Math.max(0, Number(retriesArg.split("=")[1]) || 0) : 5;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

function normalizeRel(p = "") {
  return String(p || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/");
}

function normalizeBarcode(raw) {
  return String(raw ?? "").replace(/\D/g, "").trim() || null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randSuffix(len = 5) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function hasUsableImage(rel) {
  const n = normalizeRel(rel);
  if (!n) return false;
  return fs.existsSync(path.join(IMG_BASE, n));
}

function extractGoUpcImageUrl(html) {
  const og = html.match(
    /property=["']og:image["']\s+content=["'](https:\/\/go-upc\.s3\.amazonaws\.com\/images\/[^"']+)["']/i,
  );
  if (og?.[1]) return og[1];

  const s3 = html.match(
    /https:\/\/go-upc\.s3\.amazonaws\.com\/images\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)/i,
  );
  return s3?.[0] || null;
}

function progressBar(done, total, width = 28) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.min(1, Math.max(0, done / safeTotal));
  const filled = Math.round(width * ratio);
  const empty = width - filled;
  const bar = `${c.green}${"█".repeat(filled)}${c.dim}${"░".repeat(empty)}${c.reset}`;
  const pct = `${Math.round(ratio * 100)}%`.padStart(4);
  return `${bar} ${c.bold}${pct}${c.reset} ${c.dim}${done}/${total}${c.reset}`;
}

function clearLine() {
  if (process.stdout.isTTY) process.stdout.write("\r\x1b[2K");
}

function writeProgress(done, total, currentMsg) {
  const line = `${progressBar(done, total)}  ${currentMsg}`;
  if (process.stdout.isTTY) {
    clearLine();
    process.stdout.write(line);
  } else {
    console.log(line);
  }
}

function endProgressLine() {
  if (process.stdout.isTTY) process.stdout.write("\n");
}

function retryWaitMs(attempt) {
  // 20s, 40s, 60s, 60s… (margen extra ante 429)
  return Math.min(60_000, 20_000 * 2 ** Math.max(0, attempt - 1));
}

async function fetchGoUpcImageOnce(barcode) {
  const url = `https://go-upc.com/search?q=${encodeURIComponent(barcode)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });

  if (res.status === 429) {
    return { ok: false, reason: "http_429", rateLimited: true };
  }
  if (res.status === 404 || res.status === 400) {
    return { ok: false, reason: `http_${res.status}` };
  }
  if (!res.ok) {
    return { ok: false, reason: `http_${res.status}` };
  }

  const html = await res.text();
  const imageUrl = extractGoUpcImageUrl(html);
  if (!imageUrl) {
    return { ok: false, reason: "sin_imagen_en_pagina" };
  }
  return { ok: true, imageUrl };
}

/**
 * Reintenta ante 429. Si se agotan reintentos, rateLimited=true.
 */
async function fetchGoUpcImage(barcode, onWait) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const result = await fetchGoUpcImageOnce(barcode);
    if (!result.rateLimited) return result;
    if (attempt >= MAX_RETRIES) {
      return { ok: false, reason: "http_429", rateLimited: true };
    }
    const wait = retryWaitMs(attempt + 1);
    if (onWait) onWait(wait, attempt + 1);
    await sleep(wait);
  }
  return { ok: false, reason: "http_429", rateLimited: true };
}

async function downloadImage(imageUrl, destAbs) {
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": UA, Accept: "image/*,*/*" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`download_http_${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) {
    throw new Error("archivo_muy_pequeno");
  }
  await fsp.mkdir(path.dirname(destAbs), { recursive: true });
  await fsp.writeFile(destAbs, buf);
  return buf.length;
}

async function main() {
  await sequelize.authenticate();
  await fsp.mkdir(DEST_ABS, { recursive: true });

  const rows = await InventoryProduct.findAll({
    where: {
      barcode: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] },
    },
    attributes: ["id", "name", "barcode", "primaryImageUrl"],
    order: [["id", "ASC"]],
  });

  const candidates = rows.filter((r) => {
    const code = normalizeBarcode(r.barcode);
    if (!code) return false;
    return !hasUsableImage(r.primaryImageUrl);
  });

  const end = Number.isFinite(LIMIT) ? OFFSET + LIMIT : candidates.length;
  const work = candidates.slice(OFFSET, end);

  console.log(`\n${c.magenta}${c.bold}═══ Go-UPC · enriquecer imágenes ═══${c.reset}\n`);
  console.log(
    `  ${c.dim}Candidatos (barcode sin imagen):${c.reset} ${c.bold}${c.yellow}${candidates.length}${c.reset}`,
  );
  console.log(
    `  ${c.dim}Lote actual:${c.reset} ${c.bold}${work.length}${c.reset}` +
      `  ${c.dim}(offset=${OFFSET}` +
      `${Number.isFinite(LIMIT) ? `, limit=${LIMIT}` : ", sin limit"})${c.reset}`,
  );
  console.log(`  ${c.dim}Destino:${c.reset} src/img/${DEST_FOLDER}/`);
  console.log(
    `  ${c.dim}Modo:${c.reset} ${
      dryRun
        ? `${c.cyan}${c.bold}SIMULACIÓN (--dry-run)${c.reset} ${c.dim}no escribe${c.reset}`
        : `${c.yellow}${c.bold}APLICAR${c.reset} ${c.dim}descarga + BD${c.reset}`
    }`,
  );
  console.log(
    `  ${c.dim}Delay entre productos:${c.reset} ${DELAY_MS} ms  ${c.dim}| reintentos 429:${c.reset} ${MAX_RETRIES}\n`,
  );

  if (!work.length) {
    console.log(`${c.green}Nada que enriquecer en este lote.${c.reset}`);
    return;
  }

  const stats = { ok: 0, found: 0, fail: 0, rateLimited: 0 };
  const fails = [];
  let abortedByRateLimit = false;
  let consecutiveHard429 = 0;

  for (let i = 0; i < work.length; i += 1) {
    const p = work[i];
    const barcode = normalizeBarcode(p.barcode);
    const shortName = String(p.name || "").slice(0, 34);
    writeProgress(
      i,
      work.length,
      `${c.cyan}consultando${c.reset} ${c.dim}#${p.id}${c.reset} ${shortName} ${c.yellow}${barcode}${c.reset}`,
    );

    try {
      const found = await fetchGoUpcImage(barcode, (wait, attempt) => {
        writeProgress(
          i,
          work.length,
          `${c.yellow}rate-limit 429 · espera ${Math.round(wait / 1000)}s (reintento ${attempt}/${MAX_RETRIES})${c.reset}`,
        );
      });

      if (found.rateLimited) {
        stats.rateLimited += 1;
        consecutiveHard429 += 1;
        fails.push({ id: p.id, name: p.name, barcode, reason: "http_429" });
        endProgressLine();
        console.log(
          `  ${c.yellow}⚠${c.reset} ${c.dim}[${i + 1}/${work.length}]${c.reset} #${p.id} ${p.name} ${c.dim}→${c.reset} ${c.yellow}bloqueado por Go-UPC (429)${c.reset}`,
        );
        console.log(
          `    ${c.dim}No es “sin foto”: el servidor limitó consultas. Esperá unos minutos y reintentá este lote.${c.reset}`,
        );
        if (consecutiveHard429 >= 2) {
          abortedByRateLimit = true;
          endProgressLine();
          console.log(
            `\n${c.red}${c.bold}Abortando lote:${c.reset} Go-UPC sigue en rate-limit. Probá en 30–60 min con --limit=5 --delay=15000.`,
          );
          break;
        }
      } else if (!found.ok) {
        consecutiveHard429 = 0;
        stats.fail += 1;
        fails.push({ id: p.id, name: p.name, barcode, reason: found.reason });
        endProgressLine();
        console.log(
          `  ${c.red}✗${c.reset} ${c.dim}[${i + 1}/${work.length}]${c.reset} #${p.id} ${p.name} ${c.dim}→${c.reset} ${c.red}sin foto${c.reset} ${c.dim}(${found.reason})${c.reset}`,
        );
      } else if (dryRun) {
        consecutiveHard429 = 0;
        stats.found += 1;
        endProgressLine();
        console.log(
          `  ${c.green}✓${c.reset} ${c.dim}[${i + 1}/${work.length}]${c.reset} #${p.id} ${p.name} ${c.dim}→${c.reset} ${c.green}encontrada${c.reset}`,
        );
        console.log(`    ${c.dim}${found.imageUrl}${c.reset}`);
      } else {
        consecutiveHard429 = 0;
        const ext =
          path.extname(new URL(found.imageUrl).pathname).toLowerCase() || ".jpeg";
        const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpeg";
        const base = slugify(p.name) || `product-${p.id}`;
        const fileName = `${base}-${randSuffix()}${safeExt}`;
        const rel = `${DEST_FOLDER}/${fileName}`;
        const abs = path.join(IMG_BASE, rel);

        writeProgress(
          i,
          work.length,
          `${c.yellow}descargando${c.reset} ${c.dim}#${p.id}${c.reset} ${shortName}`,
        );
        const bytes = await downloadImage(found.imageUrl, abs);
        await InventoryProduct.update(
          { primaryImageUrl: rel },
          { where: { id: p.id } },
        );
        stats.ok += 1;
        stats.found += 1;
        endProgressLine();
        console.log(
          `  ${c.green}✓${c.reset} ${c.dim}[${i + 1}/${work.length}]${c.reset} #${p.id} ${p.name} ${c.dim}→${c.reset} ${c.green}guardada${c.reset} ${c.dim}(${bytes} B)${c.reset}`,
        );
        console.log(`    ${c.cyan}${rel}${c.reset}`);
      }
    } catch (err) {
      consecutiveHard429 = 0;
      stats.fail += 1;
      fails.push({ id: p.id, name: p.name, barcode, reason: err?.message || String(err) });
      endProgressLine();
      console.log(
        `  ${c.red}✗${c.reset} ${c.dim}[${i + 1}/${work.length}]${c.reset} #${p.id} ${p.name} ${c.dim}→${c.reset} ${c.red}ERROR${c.reset} ${c.dim}(${err?.message || err})${c.reset}`,
      );
    }

    writeProgress(i + 1, work.length, `${c.dim}listo${c.reset}`);
    if (abortedByRateLimit) break;
    if (i < work.length - 1 && DELAY_MS > 0) {
      await sleep(DELAY_MS);
    }
  }

  endProgressLine();
  console.log(`\n${c.magenta}${c.bold}── Resumen del lote ──${c.reset}`);
  console.log(`  ${progressBar(Math.min(work.length, stats.ok + stats.found + stats.fail + stats.rateLimited), work.length)}`);
  console.log(
    `  ${c.green}con imagen en Go-UPC:${c.reset} ${c.bold}${stats.found}${c.reset}` +
      (dryRun ? ` ${c.dim}(simulación)${c.reset}` : ""),
  );
  if (!dryRun) {
    console.log(`  ${c.cyan}guardadas en backend:${c.reset} ${c.bold}${stats.ok}${c.reset}`);
  }
  console.log(`  ${c.red}sin foto real:${c.reset} ${c.bold}${stats.fail}${c.reset}`);
  console.log(
    `  ${c.yellow}bloqueados por rate-limit (429):${c.reset} ${c.bold}${stats.rateLimited}${c.reset}`,
  );

  if (stats.rateLimited > 0) {
    console.log(
      `\n${c.yellow}${c.bold}Nota:${c.reset} http_429 ≠ sin imagen. Go-UPC te limitó la velocidad.`,
    );
    console.log(
      `${c.dim}Esperá 30–60 min y corré de a 5 con --limit=5 --delay=15000. Entre lotes: 10–15 min.${c.reset}`,
    );
  }

  const processed = stats.ok + stats.found + stats.fail + stats.rateLimited;
  // candidatos restantes: los no tocados del lote + los posteriores
  const remainingAfterAbort = abortedByRateLimit
    ? candidates.length - (OFFSET + Math.max(0, processed - stats.rateLimited > 0 ? processed : 0))
    : Math.max(0, candidates.length - (OFFSET + work.length));

  // Más claro: si abortó, el offset para reintentar es donde falló el 429
  if (abortedByRateLimit) {
    const retryOffset = OFFSET + Math.max(0, processed - 1);
    console.log(
      `\n${c.yellow}Reintentar desde:${c.reset} --limit=5 --offset=${retryOffset} --delay=15000`,
    );
  } else if (OFFSET + work.length < candidates.length) {
    const nextOffset = OFFSET + work.length;
    const remain = candidates.length - nextOffset;
    console.log(
      `\n${c.yellow}Quedan ${remain} candidatos.${c.reset} Esperá 10–15 min y siguiente lote:`,
    );
    console.log(
      `  ${c.dim}node scripts/enrich-product-images-from-goupc.js ${dryRun ? "--dry-run " : ""}--limit=5 --offset=${nextOffset} --delay=${DELAY_MS}${c.reset}`,
    );
  } else if (!abortedByRateLimit) {
    console.log(`\n${c.green}No quedan más candidatos después de este lote.${c.reset}`);
  }

  void remainingAfterAbort;
}

main()
  .catch((err) => {
    console.error(`${c.red}Error:${c.reset}`, err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      /* ignore */
    }
  });
