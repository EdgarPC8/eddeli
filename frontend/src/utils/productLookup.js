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

/** Mejor combinación de tramos + unidades sueltas al precio base (mínimo costo). */
function resolvePackageTierBreakdown(packs, quantity, basePrice) {
  const targetQty = Math.max(0, Math.floor(Number(quantity || 0)));
  const base = to2(Number(basePrice || 0));
  if (targetQty === 0) {
    return { total: 0, tierUnits: 0, tierCost: 0, singleUnits: 0, singleCost: 0, base };
  }

  const normalizedPacks = normalizePackageTiers(packs);
  if (!normalizedPacks.length) {
    if (base <= 0) return null;
    return {
      total: to2(base * targetQty),
      tierUnits: 0,
      tierCost: 0,
      singleUnits: targetQty,
      singleCost: to2(base * targetQty),
      base,
    };
  }

  const dp = new Array(targetQty + 1).fill(Infinity);
  const prev = new Array(targetQty + 1).fill(null);

  dp[0] = 0;

  for (let i = 1; i <= targetQty; i += 1) {
    if (base >= 0 && dp[i - 1] !== Infinity) {
      const cost = dp[i - 1] + base;
      if (cost < dp[i]) {
        dp[i] = cost;
        prev[i] = "single";
      }
    }
    for (const pack of normalizedPacks) {
      if (pack.qty <= i && dp[i - pack.qty] !== Infinity) {
        const cost = dp[i - pack.qty] + pack.totalPrice;
        if (cost < dp[i]) {
          dp[i] = cost;
          prev[i] = pack;
        }
      }
    }
  }

  if (dp[targetQty] === Infinity) return null;

  let tierUnits = 0;
  let tierCost = 0;
  let singleUnits = 0;
  let rem = targetQty;
  while (rem > 0) {
    const step = prev[rem];
    if (step === "single") {
      singleUnits += 1;
      rem -= 1;
    } else if (step && typeof step === "object" && step.qty) {
      tierUnits += step.qty;
      tierCost = to2(tierCost + step.totalPrice);
      rem -= step.qty;
    } else {
      return null;
    }
  }

  return {
    total: to2(dp[targetQty]),
    tierUnits,
    tierCost: to2(tierCost),
    singleUnits,
    singleCost: to2(singleUnits * base),
    base,
  };
}

/** Mejor combinación de tramos para una cantidad exacta (mínimo costo). */
export function resolvePackageTierTotal(product, quantity) {
  const targetQty = Math.max(0, Math.floor(Number(quantity || 0)));
  if (targetQty === 0) return 0;

  const packs = normalizePackageTiers(product?.packageTiers);
  const base = to2(Number(product?.price || 0));
  if (!packs.length) return base > 0 ? to2(base * targetQty) : null;

  const breakdown = resolvePackageTierBreakdown(packs, targetQty, base);
  return breakdown?.total ?? null;
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
 * Prioridad: tramos/paquetes del producto (si NO está en grupo surtido) → mayoreo → base.
 * Los tramos de grupo se aplican después en applyTierGroupPricing.
 */
export function resolveEddeliLinePricing(product, quantity, tierGroups) {
  const qty = Number(quantity || 0);
  if (qty <= 0) {
    return { total: 0, unitPrice: 0, mode: "base", lineTotal: null };
  }

  const inGroup = findTierGroupForProduct(product?.id, tierGroups);

  if (hasPackageTiers(product) && !inGroup) {
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
    mode: inGroup ? "tier_group_pending" : "wholesale",
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

export function isTierGroupActive(group) {
  if (!group) return false;
  const v = group.isActive;
  return v !== false && v !== 0 && v !== "0";
}

/** Grupos de tramos activos listos para caja. */
export function findActiveTierGroups(tierGroups) {
  return (tierGroups || []).filter(
    (g) =>
      isTierGroupActive(g) &&
      hasTierGroupPackageTiers(g) &&
      getTierGroupProductIds(g).length > 0,
  );
}

export function findTierGroupForProduct(productId, tierGroups) {
  const pid = Number(productId);
  if (!Number.isFinite(pid)) return null;
  for (const group of findActiveTierGroups(tierGroups)) {
    if (getTierGroupProductIds(group).includes(pid)) return group;
  }
  return null;
}

export function findTierGroupById(tierGroupId, tierGroups = []) {
  if (tierGroupId == null || tierGroupId === "") return null;
  return tierGroups.find((g) => String(g.id) === String(tierGroupId)) ?? null;
}

export function isPanTierGroup(group) {
  if (!group) return false;
  const name = String(group.name ?? "").toLowerCase();
  const catName = String(group?.category?.name ?? "").toLowerCase();
  return (
    name.includes("pan") ||
    name.includes("panader") ||
    catName === "panes" ||
    catName.includes("panader")
  );
}

export function isPanaderiaProduct(product) {
  const cat = getProductCategory(product);
  const catName = String(cat?.name ?? "").toLowerCase();
  return catName === "panes" || catName.includes("panader") || catName.includes("pan");
}

/** Indicador visual en caja: panes en grupo, otro grupo, o tramo solo del producto. */
export function getProductTierVisualKind(product, tierGroups = []) {
  const group = findTierGroupForProduct(product?.id, tierGroups);
  if (group) return isPanTierGroup(group) ? "pan-group" : "other-group";
  if (hasPackageTiers(product)) return "product-tier";
  return null;
}

export function getCartRowTierVisualKind(row, products = [], tierGroups = []) {
  if (row.pricingMode === "tier_group_package" || row.tierGroupId != null) {
    const group =
      findTierGroupById(row.tierGroupId, tierGroups) ??
      findTierGroupForProduct(row.productId, tierGroups);
    if (group) return isPanTierGroup(group) ? "pan-group" : "other-group";
  }
  if (row.mixGroupId || row.mixGroupLabel) {
    const label = String(row.mixGroupLabel ?? "").toLowerCase();
    if (label.includes("pan")) return "pan-group";
    const product = products.find((p) => Number(p.id) === Number(row.productId));
    if (product && isPanaderiaProduct(product)) return "pan-group";
    return "other-group";
  }
  if (row.pricingMode === "package") return "product-tier";
  return null;
}

export function formatProductTierPricesOnly(product, tierGroups = []) {
  const hints = formatProductTierHints(product, tierGroups);
  return hints?.text ?? null;
}

/** API tramos + respaldo desde categorías con canasta (datos legacy). */
export function buildEffectiveTierGroups(tierGroups, products) {
  const apiGroups = findActiveTierGroups(tierGroups || []);
  if (apiGroups.length) return apiGroups;

  const map = new Map();
  for (const product of products || []) {
    const cat = getProductCategory(product);
    if (!cat?.id || !hasCategoryPackageTiers(cat)) continue;
    const ids = getCategoryMixMatchProductIds(cat);
    if (!ids.length) continue;
    const catKey = String(cat.id);
    if (!map.has(catKey)) {
      map.set(catKey, {
        id: `legacy-cat-${cat.id}`,
        name: getCategoryMixMatchLabel(cat),
        packageTiers: cat.packageTiers,
        productIds: ids,
        isActive: true,
      });
    }
  }
  return [...map.values()];
}

/** Texto de tramos para UI: distingue producto vs grupo surtido. */
export function formatProductTierHints(product, tierGroups = []) {
  const group = findTierGroupForProduct(product?.id, tierGroups);
  if (group) {
    const tiers = getTierGroupPackageTiers(group);
    if (tiers.length) {
      const tierText = tiers.map((t) => `${t.qty}=$${t.totalPrice.toFixed(2)}`).join(" · ");
      return {
        scope: "group",
        label: `Grupo ${getTierGroupLabel(group)}`,
        text: tierText,
      };
    }
  }
  const productTiers = normalizePackageTiers(product?.packageTiers);
  if (productTiers.length) {
    return {
      scope: "product",
      label: "Tramo producto",
      text: productTiers.map((t) => `${t.qty}=$${t.totalPrice.toFixed(2)}`).join(" · "),
    };
  }
  return null;
}

/** Total de línea para vista rápida (accesos rápidos), incluyendo tramos de grupo. */
export function resolveEddeliQuickLineTotal(product, quantity, tierGroups = []) {
  const qty = Number(quantity || 0);
  if (qty <= 0) return 0;

  const pricing = resolveEddeliLinePricing(product, qty, tierGroups);
  if (pricing.mode === "tier_group_pending") {
    const group = findTierGroupForProduct(product?.id, tierGroups);
    if (group) {
      const tiers = getTierGroupPackageTiers(group);
      const total = resolvePackageTierTotal(
        { packageTiers: tiers, price: product?.price ?? 0 },
        qty,
      );
      if (total != null) return total;
    }
  }
  return pricing.total;
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
 * Reparte el total del grupo: unidades en tramo vs sueltas a precio base,
 * priorizando líneas con más cantidad para el tramo (ej. 8 dulce = $1 + 1 cacho = $0.15).
 */
function allocateGroupTotalToLines(indices, rows, breakdown, pricingMode = "category_package") {
  const { tierUnits, tierCost, base } = breakdown;
  let tierUnitsLeft = tierUnits;

  const sortedIndices = [...indices].sort(
    (a, b) =>
      Math.max(0, Math.floor(Number(rows[b].quantity) || 0)) -
      Math.max(0, Math.floor(Number(rows[a].quantity) || 0)),
  );

  const lineTotals = new Map();
  let tierCostAssigned = 0;

  for (let pos = 0; pos < sortedIndices.length; pos += 1) {
    const i = sortedIndices[pos];
    const qty = Math.max(0, Math.floor(Number(rows[i].quantity) || 0));
    if (qty <= 0) continue;

    const tierAssign = Math.min(qty, tierUnitsLeft);
    const singleAssign = qty - tierAssign;
    const isLastTierLine = pos === sortedIndices.length - 1;

    let lineTotal = 0;
    if (tierAssign > 0 && tierUnits > 0) {
      const tierShare = isLastTierLine
        ? to2(tierCost - tierCostAssigned)
        : to2(tierCost * (tierAssign / tierUnits));
      lineTotal = to2(lineTotal + tierShare);
      tierCostAssigned = to2(tierCostAssigned + tierShare);
      tierUnitsLeft -= tierAssign;
    }
    if (singleAssign > 0) {
      lineTotal = to2(lineTotal + singleAssign * base);
    }

    lineTotals.set(i, lineTotal);
  }

  for (const i of indices) {
    const qty = Math.max(0, Math.floor(Number(rows[i].quantity) || 0));
    const lineTotal = lineTotals.get(i) ?? 0;
    rows[i] = {
      ...rows[i],
      price: qty > 0 ? to2(lineTotal / qty) : 0,
      lineTotal,
      pricingMode,
    };
  }
}

/**
 * Aplica tramos por grupo (mix-and-match): suma unidades de productos del mismo grupo
 * y reparte el mejor precio entre las líneas del carrito.
 */
export function applyTierGroupPricing(cartRows, products, tierGroups = []) {
  if (!Array.isArray(cartRows) || !cartRows.length) return [];

  const activeGroups = buildEffectiveTierGroups(tierGroups, products);
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

    // Canasta surtido (acceso rápido): mezcla líneas del mismo mixGroupId.
    // Agregado normal: cada línea se trama solo con su cantidad, sin mezclar con otras.
    const poolKey = row.mixGroupId
      ? `mix:${String(row.mixGroupId)}:${String(group.id)}`
      : `line:${idx}:${String(group.id)}`;

    if (!groups.has(poolKey)) {
      groups.set(poolKey, { group, indices: [] });
    }
    groups.get(poolKey).indices.push(idx);
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
    const base = to2(Number(refProduct?.price ?? 0));
    const breakdown = resolvePackageTierBreakdown(tiers, totalQty, base);
    if (!breakdown) continue;

    indices.forEach((i) => {
      rows[i] = {
        ...rows[i],
        tierGroupId: group.id,
        mixGroupLabel: rows[i].mixGroupLabel || mixLabel,
      };
    });
    allocateGroupTotalToLines(indices, rows, breakdown, "tier_group_package");
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
    const pricing = resolveEddeliLinePricing(product, row.quantity, activeGroups);
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
    if (row.tierGroupId == null || row.tierGroupId === "") continue;
    const key = String(row.tierGroupId);
    const prev = map.get(key) || {
      tierGroupId: row.tierGroupId,
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
