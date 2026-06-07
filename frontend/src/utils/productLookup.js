/** Normaliza lectura de lector/cámara (solo dígitos). */
export function normalizeProductBarcode(raw) {
  return String(raw ?? "").replace(/\D/g, "").trim();
}

const to2 = (n) => Number(Number(n || 0).toFixed(2));

function parseWholesaleRules(product) {
  try {
    if (Array.isArray(product?.wholesaleRules)) return product.wholesaleRules;
    if (typeof product?.wholesaleRules === "string") {
      return JSON.parse(product.wholesaleRules || "[]");
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Precio unitario según cantidad (detalle vs mayoreo). */
export function resolveEddeliUnitPrice(product, quantity) {
  const qty = Number(quantity || 0);
  const base = to2(Number(product?.price || 0));
  const rules = parseWholesaleRules(product)
    .filter((r) => Number(r?.minQty) > 0 && Number(r?.price) >= 0)
    .sort((a, b) => Number(b.minQty) - Number(a.minQty));
  for (const rule of rules) {
    if (qty >= Number(rule.minQty)) return to2(Number(rule.price));
  }
  return base;
}

export function findEddeliProductByCode(products, rawCode) {
  const code = normalizeProductBarcode(rawCode);
  if (!code) return null;
  const low = code.toLowerCase();
  return (
    products.find((p) => normalizeProductBarcode(p.barcode).toLowerCase() === low) ||
    products.find((p) => String(p.sku || "").trim().toLowerCase() === low) ||
    null
  );
}
