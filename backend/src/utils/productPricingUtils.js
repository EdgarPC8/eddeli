/** Normaliza tramos de paquete: [{ qty, totalPrice }, ...] */
import { repairJsonFieldValue } from "./jsonFieldUtils.js";

const to2 = (n) => Number(Number(n || 0).toFixed(2));
const PRICE_EPS = 0.009;

export function normalizePackageTiersStrict(input) {
  if (input == null || input === "" || input === "[]") return null;

  const val = repairJsonFieldValue(input, { emptyArrayToNull: false });
  if (!Array.isArray(val)) {
    throw new Error("packageTiers debe ser un array de { qty, totalPrice }.");
  }

  const tiers = val
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const qty = Number(t.qty);
      const totalPrice = Number(t.totalPrice ?? t.total);
      if (!Number.isFinite(qty) || qty <= 0) return null;
      if (!Number.isFinite(totalPrice) || totalPrice < 0) return null;
      return { qty, totalPrice: Number(totalPrice.toFixed(2)) };
    })
    .filter(Boolean)
    .sort((a, b) => a.qty - b.qty);

  const seen = new Set();
  for (const t of tiers) {
    if (seen.has(t.qty)) {
      throw new Error(`packageTiers: cantidad duplicada (${t.qty}).`);
    }
    seen.add(t.qty);
  }

  if (!tiers.length) return null;
  return tiers;
}

/** Normaliza tramos sin lanzar (lectura / caja). */
export function normalizePackageTiers(input) {
  try {
    return normalizePackageTiersStrict(input) || [];
  } catch {
    return [];
  }
}

function parseProductIds(raw) {
  if (Array.isArray(raw)) {
    return raw.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return parseProductIds(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

/** Mejor combinación de tramos + unidades sueltas al precio base (mínimo costo). */
export function resolvePackageTierBreakdown(packs, quantity, basePrice) {
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

export function resolvePackageTierTotal(packs, quantity, basePrice) {
  const breakdown = resolvePackageTierBreakdown(packs, quantity, basePrice);
  return breakdown?.total ?? null;
}

/**
 * Precio unitario permitido en caja para Empleado:
 * catálogo, tramos del producto o tramos del grupo surtido (si aplica).
 */
export function resolveAllowedPosUnitPrice(product, quantity, tierGroups = []) {
  const qty = Math.max(0, Math.floor(Number(quantity || 0)));
  const catalog = to2(Number(product?.price || 0));
  if (qty <= 0) return catalog;

  const productId = Number(product?.id);
  const activeGroups = (tierGroups || []).filter((g) => g && g.isActive !== false && g.isActive !== 0);
  const group = activeGroups.find((g) => parseProductIds(g.productIds).includes(productId));

  const packs = group
    ? normalizePackageTiers(group.packageTiers)
    : normalizePackageTiers(product?.packageTiers);

  if (!packs.length) return catalog;

  const total = resolvePackageTierTotal(packs, qty, catalog);
  if (total == null || qty <= 0) return catalog;
  return to2(total / qty);
}

/** ¿El unitario del carrito coincide con catálogo o con tramo automático? */
export function isEmployeePosUnitPriceAllowed(product, quantity, unitPrice, tierGroups = []) {
  const price = Number(unitPrice);
  if (!Number.isFinite(price) || price < 0) return false;
  const catalog = to2(Number(product?.price || 0));
  if (Math.abs(price - catalog) <= PRICE_EPS) return true;
  const tierUnit = resolveAllowedPosUnitPrice(product, quantity, tierGroups);
  return Math.abs(price - tierUnit) <= PRICE_EPS;
}

export { PRICE_EPS };
