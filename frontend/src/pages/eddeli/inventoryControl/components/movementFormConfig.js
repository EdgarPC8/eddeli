const GRAM_FACTORS = {
  gr: 1,
  g: 1,
  kg: 1000,
  lb: 453.592,
  q: 100_000,
  qq: 100_000,
  arroba: 11_339.8,
  l: 1000,
  ml: 1,
};

export const MOVEMENT_TYPES = [
  {
    value: "entrada",
    label: "Entrada",
    hint: "Compras, devoluciones u otras entradas",
    color: "success",
  },
  {
    value: "salida",
    label: "Salida",
    hint: "Ventas, consumo, merma",
    color: "error",
  },
  {
    value: "ajuste",
    label: "Ajuste",
    hint: "Inventario físico (nuevo stock)",
    color: "info",
  },
  {
    value: "produccion",
    label: "Producción",
    hint: "Fabricar según receta",
    color: "secondary",
  },
  {
    value: "apertura",
    label: "Abrir presentación",
    hint: "Quintal/funda → insumo genérico",
    color: "warning",
  },
];

export const REASON_OPTIONS = {
  entrada: [
    { value: "ENTRADA_COMPRA", label: "Compra" },
    { value: "ENTRADA_DEVOLUCION", label: "Devolución" },
    { value: "ENTRADA_OTRA", label: "Otra entrada" },
  ],
  salida: [
    { value: "SALIDA_VENTA", label: "Venta" },
    { value: "SALIDA_CONSUMO", label: "Consumo / uso interno" },
    { value: "SALIDA_MERMA", label: "Merma / daño" },
    { value: "SALIDA_OTRA", label: "Otra salida" },
  ],
};

export function getUnitAbbr(product) {
  return (
    product?.unit?.abbreviation ||
    product?.InventoryUnit?.abbreviation ||
    product?.ERP_inventory_unit?.abbreviation ||
    ""
  );
}

function resolveGramFactor(unitAbbr, unitObj) {
  const abbr = String(unitAbbr || "").trim().toLowerCase();
  if (GRAM_FACTORS[abbr] != null) return GRAM_FACTORS[abbr];
  const factor = Number(unitObj?.factor);
  if (Number.isFinite(factor) && factor > 0) return factor;
  return 1;
}

function isCountUnit(abbr) {
  const a = String(abbr || "").trim().toLowerCase();
  return ["un", "u", "und", "unidad", "unit", "units", "pc", "pcs"].includes(a);
}

/** Estima gramos por 1 unidad de presentación (vista previa). */
export function estimateGramsPerPack(product) {
  if (!product) return 0;
  const abbr = getUnitAbbr(product);
  const unit = product.unit || product.InventoryUnit || product.ERP_inventory_unit;
  if (isCountUnit(abbr)) {
    const sw = Number(product.standardWeightGrams ?? 0);
    return sw > 0 ? sw : 0;
  }
  return resolveGramFactor(abbr, unit);
}

export function gramsToGenericDisplay(genericProduct, grams) {
  if (!genericProduct || !grams) return null;
  const abbr = getUnitAbbr(genericProduct);
  const unit = genericProduct.unit || genericProduct.InventoryUnit;
  if (isCountUnit(abbr)) {
    const sw = Number(genericProduct.standardWeightGrams ?? 0) || 1;
    return { value: grams / sw, label: abbr || "un" };
  }
  const factor = resolveGramFactor(abbr, unit);
  return { value: grams / factor, label: abbr || "g" };
}

export function isPresentationProduct(p) {
  return Boolean(p?.genericProductId) && p?.type === "raw";
}

export function isGenericIngredientProduct(p) {
  return Boolean(p?.isGenericIngredient) && !p?.genericProductId;
}

export function isPresentationOrNormalRaw(p) {
  if (!p || p.type !== "raw") return false;
  return !isGenericIngredientProduct(p);
}

/** Etiqueta de cantidad según genérico (peso) vs producto/presentación (unidad de compra). */
export function getMovementQuantityLabel(product, { isAjuste = false } = {}) {
  if (!product) return isAjuste ? "Nuevo stock" : "Cantidad";

  const abbr = getUnitAbbr(product);
  const a = String(abbr || "").trim().toLowerCase();

  let unitLabel;
  if (isGenericIngredientProduct(product)) {
    if (isCountUnit(abbr) && Number(product?.standardWeightGrams) > 0) {
      unitLabel = "g";
    } else if (["g", "gr", "gram", "grams"].includes(a)) {
      unitLabel = "g";
    } else if (["kg", "kilo", "kilos"].includes(a)) {
      unitLabel = "kg";
    } else if (["l", "ml"].includes(a)) {
      unitLabel = abbr;
    } else {
      unitLabel = abbr || "g";
    }
  } else {
    unitLabel = abbr || "unidad";
  }

  return isAjuste ? `Nuevo stock (${unitLabel})` : `Cantidad (${unitLabel})`;
}

export function getMovementQuantityHelper(product) {
  if (!product) return undefined;
  if (isGenericIngredientProduct(product)) {
    const abbr = getUnitAbbr(product);
    const a = String(abbr || "").trim().toLowerCase();
    if (["g", "gr", "kg", "kilo", "kilos"].includes(a) || isCountUnit(abbr)) {
      return "Insumo genérico: ingresa la cantidad en gramos o en la unidad de peso del producto.";
    }
    return `Insumo genérico: cantidad en ${abbr || "unidad del producto"}.`;
  }
  return `Producto o presentación: cantidad en ${getUnitAbbr(product) || "unidades"} (quintal, unidad, etc.).`;
}

export function showPriceField(type, reason) {
  if (type === "entrada" && reason === "ENTRADA_COMPRA") return true;
  if (type === "salida") return true;
  return false;
}

export function isPriceRequired(type, reason) {
  return type === "entrada" && reason === "ENTRADA_COMPRA";
}

/** Precio opcional en salida (referencia de valor); obligatorio solo en compra. */
export function isPriceOptional(type) {
  return type === "salida";
}

/** Precio de catálogo según el tipo de movimiento (referencia / autocompletado). */
export function getMovementCatalogPrice(product, type, reason) {
  if (!product) return 0;
  if (type === "salida") {
    const dist = Number(product.distributorPrice ?? 0);
    if (dist > 0) return dist;
    return Number(product.price ?? 0);
  }
  if (type === "entrada" && reason === "ENTRADA_COMPRA") {
    const sup = Number(product.supplierPrice ?? 0);
    if (sup > 0) return sup;
    return Number(product.price ?? 0);
  }
  return 0;
}

export function getMovementCatalogPriceLabel(type, reason) {
  if (type === "salida") return "distribuidor";
  if (type === "entrada" && reason === "ENTRADA_COMPRA") return "proveedor";
  return "catálogo";
}
