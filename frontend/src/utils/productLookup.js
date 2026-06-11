/** Normaliza lectura de lector/cámara (solo dígitos). */
export function normalizeProductBarcode(raw) {
  return String(raw ?? "").replace(/\D/g, "").trim();
}

const to2 = (n) => Number(Number(n || 0).toFixed(2));

/** Acepta array, string JSON (incluso doble codificado) u objeto { tiers }. */
export function normalizeWholesaleRules(val) {
  if (val == null || val === "") return [];
  if (typeof val === "string") {
    try {
      return normalizeWholesaleRules(JSON.parse(val));
    } catch {
      return [];
    }
  }
  if (Array.isArray(val)) {
    return val.filter((r) => r && typeof r === "object");
  }
  if (val && typeof val === "object" && Array.isArray(val.tiers)) {
    return val.tiers.filter((r) => r && typeof r === "object");
  }
  return [];
}

/** Tramos de paquete: [{ qty, totalPrice }, ...] */
export function normalizePackageTiers(val) {
  if (val == null || val === "") return [];
  if (typeof val === "string") {
    try {
      return normalizePackageTiers(JSON.parse(val));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(val)) return [];
  return val
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const qty = Number(t.qty);
      const totalPrice = Number(t.totalPrice ?? t.total);
      if (!qty || qty <= 0 || !Number.isFinite(totalPrice) || totalPrice < 0) return null;
      return { qty, totalPrice: to2(totalPrice) };
    })
    .filter(Boolean)
    .sort((a, b) => a.qty - b.qty);
}

export function hasPackageTiers(product) {
  return normalizePackageTiers(product?.packageTiers).length > 0;
}

function parseWholesaleRules(product) {
  return normalizeWholesaleRules(product?.wholesaleRules);
}

function unitPriceFromRule(basePrice, rule) {
  if (rule?.price != null && Number.isFinite(Number(rule.price)) && Number(rule.price) >= 0) {
    return to2(Number(rule.price));
  }
  if (
    rule?.pricePerUnit != null &&
    Number.isFinite(Number(rule.pricePerUnit)) &&
    Number(rule.pricePerUnit) >= 0
  ) {
    return to2(Number(rule.pricePerUnit));
  }
  if (
    rule?.discountPercent != null &&
    Number.isFinite(Number(rule.discountPercent)) &&
    Number(rule.discountPercent) >= 0
  ) {
    return to2(basePrice * (1 - Number(rule.discountPercent) / 100));
  }
  return null;
}

/** Mejor combinación de tramos para una cantidad exacta (mínimo costo). */
export function resolvePackageTierTotal(product, quantity) {
  const targetQty = Math.max(0, Math.floor(Number(quantity || 0)));
  if (targetQty === 0) return 0;

  const packs = normalizePackageTiers(product?.packageTiers);
  if (!packs.length) return null;

  const dp = new Array(targetQty + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= targetQty; i += 1) {
    for (const pack of packs) {
      if (pack.qty <= i && dp[i - pack.qty] !== Infinity) {
        dp[i] = Math.min(dp[i], dp[i - pack.qty] + pack.totalPrice);
      }
    }
  }

  if (dp[targetQty] !== Infinity) return to2(dp[targetQty]);

  const single = packs.find((p) => p.qty === 1);
  if (single) return to2(single.totalPrice * targetQty);

  const base = to2(Number(product?.price || 0));
  return to2(base * targetQty);
}

/** Precio unitario según cantidad (mayoreo clásico; sin tramos). */
export function resolveEddeliUnitPrice(product, quantity) {
  const qty = Number(quantity || 0);
  const base = to2(Number(product?.price || 0));
  const rules = parseWholesaleRules(product)
    .filter((r) => Number(r?.minQty) > 0)
    .sort((a, b) => Number(b.minQty) - Number(a.minQty));

  for (const rule of rules) {
    if (qty >= Number(rule.minQty)) {
      const unit = unitPriceFromRule(base, rule);
      if (unit != null) return unit;
    }
  }
  return base;
}

/**
 * Precio de línea en Caja.
 * Prioridad: tramos/paquetes → mayoreo → precio base.
 */
export function resolveEddeliLinePricing(product, quantity) {
  const qty = Number(quantity || 0);
  if (qty <= 0) {
    return { total: 0, unitPrice: 0, mode: "base", lineTotal: null };
  }

  if (hasPackageTiers(product)) {
    const total = resolvePackageTierTotal(product, qty);
    return {
      total,
      unitPrice: to2(total / qty),
      mode: "package",
      lineTotal: total,
    };
  }

  const unitPrice = resolveEddeliUnitPrice(product, qty);
  return {
    total: to2(unitPrice * qty),
    unitPrice,
    mode: "wholesale",
    lineTotal: null,
  };
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
