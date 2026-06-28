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

export function getTierGroupPackageTiers(group) {
  return normalizePackageTiers(group?.packageTiers);
}

export function getTierGroupProductIds(group) {
  let raw = group?.productIds;
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

export function getTierGroupLabel(group) {
  return String(group?.name ?? "").trim() || "Surtido";
}

export function hasTierGroupPackageTiers(group) {
  return getTierGroupPackageTiers(group).length > 0;
}

export function productParticipatesInTierGroup(product, group) {
  if (!group || !hasTierGroupPackageTiers(group)) return false;
  return getTierGroupProductIds(group).includes(Number(product.id));
}

/** Grupos de tramos activos listos para caja. */
export function findActiveTierGroups(tierGroups) {
  return (tierGroups || []).filter(
    (g) =>
      g.isActive !== false &&
      hasTierGroupPackageTiers(g) &&
      getTierGroupProductIds(g).length > 0,
  );
}

export function getSurtidoProductsForTierGroup(products, group) {
  const allowed = new Set(getTierGroupProductIds(group));
  return (products || []).filter((p) => {
    if (!allowed.has(Number(p.id))) return false;
    if (p.type && p.type !== "final") return false;
    if (p.isActive === 0 || p.isActive === false) return false;
    return true;
  });
}

export function getTierGroupMixMatchHint(packageTiers, currentQty) {
  const qty = Math.max(0, Math.floor(Number(currentQty || 0)));
  const packs = normalizePackageTiers(packageTiers).filter((p) => p.qty > qty);
  if (!packs.length) return null;
  const next = packs[0];
  return {
    remaining: next.qty - qty,
    nextQty: next.qty,
    nextTotal: next.totalPrice,
  };
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

/** @deprecated Usar findActiveTierGroups */
export function findSurtidoCategoriesFromProducts(products, tierGroups = []) {
  return findActiveTierGroups(tierGroups);
}

export function getSurtidoProductsForCategory(products, groupOrCategory) {
  if (groupOrCategory?.productIds != null) {
    return getSurtidoProductsForTierGroup(products, groupOrCategory);
  }
  const allowed = new Set(getCategoryMixMatchProductIds(groupOrCategory));
  return (products || []).filter((p) => {
    if (!allowed.has(Number(p.id))) return false;
    if (p.type && p.type !== "final") return false;
    if (p.isActive === 0 || p.isActive === false) return false;
    return true;
  });
}

/** Siguiente tramo al que falta llegar (para avisos en caja). */
export function getCategoryMixMatchHint(packageTiers, currentQty) {
  return getTierGroupMixMatchHint(packageTiers, currentQty);
}

/**
 * Reparte el total de un grupo entre líneas según cantidad.
 */
function allocateGroupTotalToLines(indices, rows, groupTotal, pricingMode = "category_package") {
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
      pricingMode,
    };
  });
}

/**
 * Aplica tramos por grupo (mix-and-match): suma unidades de productos del mismo grupo
 * y reparte el mejor precio entre las líneas del carrito.
 */
export function applyTierGroupPricing(cartRows, products, tierGroups = []) {
  if (!Array.isArray(cartRows) || !cartRows.length) return [];

  const activeGroups = findActiveTierGroups(tierGroups);
  const groupByProductId = new Map();
  for (const g of activeGroups) {
    for (const pid of getTierGroupProductIds(g)) {
      groupByProductId.set(pid, g);
    }
  }

  const productById = new Map((products || []).map((p) => [Number(p.id), p]));
  const rows = cartRows.map((row) => ({ ...row }));

  const groups = new Map();

  rows.forEach((row, idx) => {
    if (row.pricingMode === "manual") return;
    const product = productById.get(Number(row.productId));
    if (!product) return;
    const group = groupByProductId.get(Number(product.id));
    if (!group) return;
    const groupId = Number(group.id);
    if (!groups.has(groupId)) {
      groups.set(groupId, { group, indices: [] });
    }
    groups.get(groupId).indices.push(idx);
  });

  for (const { group, indices } of groups.values()) {
    const tiers = getTierGroupPackageTiers(group);
    const mixLabel = getTierGroupLabel(group);
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
        tierGroupId: group.id,
        mixGroupLabel: rows[i].mixGroupLabel || mixLabel,
      };
    });
    allocateGroupTotalToLines(indices, rows, groupTotal, "tier_group_package");
  }

  rows.forEach((row, idx) => {
    if (
      row.pricingMode === "manual" ||
      row.pricingMode === "category_package" ||
      row.pricingMode === "tier_group_package"
    ) {
      return;
    }
    const product = productById.get(Number(row.productId));
    if (!product) return;
    const pricing = resolveEddeliLinePricing(product, row.quantity);
    rows[idx] = {
      ...row,
      price: pricing.unitPrice,
      lineTotal: pricing.lineTotal,
      pricingMode: pricing.mode,
      tierGroupId: undefined,
    };
  });

  return rows;
}

/** @deprecated Usar applyTierGroupPricing */
export function applyCategoryMixMatchPricing(cartRows, products, tierGroups = []) {
  return applyTierGroupPricing(cartRows, products, tierGroups);
}

/** Totales y avisos por grupo de tramos (para UI de caja). */
export function summarizeTierGroups(pricedCart) {
  const map = new Map();
  for (const row of pricedCart || []) {
    if (!row.tierGroupId) continue;
    const key = Number(row.tierGroupId);
    const prev = map.get(key) || {
      tierGroupId: key,
      groupName: row.mixGroupLabel || "Grupo",
      quantity: 0,
      total: 0,
    };
    prev.quantity += Math.max(0, Math.floor(Number(row.quantity) || 0));
    prev.total = to2(prev.total + Number(lineRowTotal(row)));
    map.set(key, prev);
  }
  return [...map.values()];
}

/** @deprecated Usar summarizeTierGroups */
export function summarizeCategoryMixMatchGroups(pricedCart) {
  return summarizeTierGroups(pricedCart).map((g) => ({
    categoryId: g.tierGroupId,
    categoryName: g.groupName,
    quantity: g.quantity,
    total: g.total,
  }));
}

function lineRowTotal(row) {
  const qty = Number(row.quantity || 0);
  const unitPrice = Number(row.price || 0);
  if (row.lineTotal != null && (row.pricingMode === "package" || row.pricingMode === "category_package" || row.pricingMode === "tier_group_package")) {
    return to2(Number(row.lineTotal));
  }
  return to2(qty * unitPrice);
}
