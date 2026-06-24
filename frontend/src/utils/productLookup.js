/** Normaliza lectura de lector/cámara (solo dígitos). */
export function normalizeProductBarcode(raw) {
  return String(raw ?? "").replace(/\D/g, "").trim();
}

const to2 = (n) => Number(Number(n || 0).toFixed(2));

function unwrapPackageTiersValue(val, depth = 0) {
  if (val == null || val === "") return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && depth < 8) {
    const s = val.trim();
    if (!s) return [];
    try {
      return unwrapPackageTiersValue(JSON.parse(s), depth + 1);
    } catch {
      return [];
    }
  }
  return [];
}

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
  const parsed = unwrapPackageTiersValue(val);
  if (!Array.isArray(parsed)) return [];
  return parsed
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

export function getProductCategory(product) {
  return product?.ERP_inventory_category || product?.category || null;
}

export function getProductCategoryId(product) {
  const cat = getProductCategory(product);
  const id = cat?.id ?? product?.categoryId;
  return id != null && id !== "" ? Number(id) : null;
}

export function getCategoryPackageTiers(category) {
  return normalizePackageTiers(category?.packageTiers);
}

export function hasCategoryPackageTiers(category) {
  return getCategoryPackageTiers(category).length > 0;
}

export function getCategoryMixMatchProductIds(category) {
  let raw = category?.mixMatchProductIds;
  if (typeof raw === "string" && raw.trim()) {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0);
}

export function getCategoryMixMatchLabel(category) {
  const label = String(category?.mixMatchLabel ?? "").trim();
  if (label) return label;
  if (String(category?.name ?? "").toLowerCase() === "panes") return "Pan surtido";
  return category?.name ? `Surtido ${category.name}` : "Surtido";
}

export function productParticipatesInCategoryMix(product, category) {
  if (!category || !hasCategoryPackageTiers(category)) return false;
  const allowed = getCategoryMixMatchProductIds(category);
  if (!allowed.length) {
    return getProductCategoryId(product) === Number(category.id);
  }
  return allowed.includes(Number(product.id));
}

/** Categorías con canasta surtido configurada (tramos + productos seleccionados). */
export function findSurtidoCategoriesFromProducts(products) {
  const map = new Map();
  for (const p of products || []) {
    const cat = getProductCategory(p);
    if (!cat?.id || !hasCategoryPackageTiers(cat)) continue;
    const ids = getCategoryMixMatchProductIds(cat);
    if (!ids.length) continue;
    map.set(Number(cat.id), cat);
  }
  return [...map.values()];
}

export function getSurtidoProductsForCategory(products, category) {
  const allowed = new Set(getCategoryMixMatchProductIds(category));
  return (products || []).filter((p) => {
    if (!allowed.has(Number(p.id))) return false;
    if (p.type && p.type !== "final") return false;
    if (p.isActive === 0 || p.isActive === false) return false;
    return true;
  });
}

/** Siguiente tramo al que falta llegar (para avisos en caja). */
export function getCategoryMixMatchHint(packageTiers, currentQty) {
  const qty = Math.max(0, Math.floor(Number(currentQty || 0)));
  const packs = getCategoryPackageTiers({ packageTiers }).filter((p) => p.qty > qty);
  if (!packs.length) return null;
  const next = packs[0];
  return {
    remaining: next.qty - qty,
    nextQty: next.qty,
    nextTotal: next.totalPrice,
  };
}

/**
 * Reparte el total de un grupo entre líneas según cantidad.
 */
function allocateGroupTotalToLines(indices, rows, groupTotal) {
  const totalQty = indices.reduce(
    (sum, i) => sum + Math.max(0, Math.floor(Number(rows[i].quantity) || 0)),
    0,
  );
  if (totalQty <= 0) return;

  let assigned = 0;
  indices.forEach((i, pos) => {
    const qty = Math.max(0, Math.floor(Number(rows[i].quantity) || 0));
    if (qty <= 0) return;
    const isLast = pos === indices.length - 1;
    const lineTotal = isLast
      ? to2(groupTotal - assigned)
      : to2(groupTotal * (qty / totalQty));
    if (!isLast) assigned = to2(assigned + lineTotal);
    rows[i] = {
      ...rows[i],
      price: qty > 0 ? to2(lineTotal / qty) : 0,
      lineTotal,
      pricingMode: "category_package",
    };
  });
}

/**
 * Aplica tramos por categoría (mix-and-match): suma unidades de la misma categoría
 * y reparte el mejor precio entre las líneas del carrito.
 */
export function applyCategoryMixMatchPricing(cartRows, products) {
  if (!Array.isArray(cartRows) || !cartRows.length) return [];

  const productById = new Map((products || []).map((p) => [Number(p.id), p]));
  const rows = cartRows.map((row) => ({ ...row }));

  const groups = new Map();

  rows.forEach((row, idx) => {
    if (row.pricingMode === "manual") return;
    const product = productById.get(Number(row.productId));
    if (!product) return;
    const cat = getProductCategory(product);
    if (!productParticipatesInCategoryMix(product, cat)) return;
    const catId = getProductCategoryId(product);
    if (!catId) return;
    if (!groups.has(catId)) {
      groups.set(catId, { cat, indices: [] });
    }
    groups.get(catId).indices.push(idx);
  });

  for (const { cat, indices } of groups.values()) {
    const tiers = getCategoryPackageTiers(cat);
    const mixLabel = getCategoryMixMatchLabel(cat);
    const totalQty = indices.reduce(
      (sum, i) => sum + Math.max(0, Math.floor(Number(rows[i].quantity) || 0)),
      0,
    );
    if (totalQty <= 0) continue;

    const refProduct = productById.get(Number(rows[indices[0]].productId));
    const groupTotal = resolvePackageTierTotal(
      { packageTiers: tiers, price: refProduct?.price ?? 0 },
      totalQty,
    );

    indices.forEach((i) => {
      rows[i] = {
        ...rows[i],
        categoryId: cat.id,
        categoryName: cat.name,
        mixGroupLabel: rows[i].mixGroupLabel || mixLabel,
      };
    });
    allocateGroupTotalToLines(indices, rows, groupTotal);
  }

  rows.forEach((row, idx) => {
    if (row.pricingMode === "manual" || row.pricingMode === "category_package") return;
    const product = productById.get(Number(row.productId));
    if (!product) return;
    const pricing = resolveEddeliLinePricing(product, row.quantity);
    rows[idx] = {
      ...row,
      price: pricing.unitPrice,
      lineTotal: pricing.lineTotal,
      pricingMode: pricing.mode,
      categoryId: undefined,
      categoryName: undefined,
    };
  });

  return rows;
}

/** Totales y avisos por categoría con tramos (para UI de caja). */
export function summarizeCategoryMixMatchGroups(pricedCart) {
  const map = new Map();
  for (const row of pricedCart || []) {
    if (!row.categoryId) continue;
    const key = Number(row.categoryId);
    const prev = map.get(key) || {
      categoryId: key,
      categoryName: row.mixGroupLabel || row.categoryName || "Categoría",
      quantity: 0,
      total: 0,
    };
    prev.quantity += Math.max(0, Math.floor(Number(row.quantity) || 0));
    prev.total = to2(prev.total + Number(lineRowTotal(row)));
    map.set(key, prev);
  }
  return [...map.values()];
}

function lineRowTotal(row) {
  const qty = Number(row.quantity || 0);
  const unitPrice = Number(row.price || 0);
  if (row.lineTotal != null && (row.pricingMode === "package" || row.pricingMode === "category_package")) {
    return to2(Number(row.lineTotal));
  }
  return to2(qty * unitPrice);
}
