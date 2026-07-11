/** Etiquetas y helpers para tipo de local (sucursal propia vs vitrina). */

export function normalizeLocationKind(kind) {
  return String(kind || "").toLowerCase() === "propia" ? "propia" : "vitrina";
}

export function locationKindLabel(kind, { publicFacing = false } = {}) {
  const k = normalizeLocationKind(kind);
  if (publicFacing) {
    return k === "propia" ? "Punto de venta" : "Vitrina";
  }
  return k === "propia" ? "Sucursal propia" : "Vitrina";
}

export function locationKindHint(kind, { publicFacing = false } = {}) {
  const k = normalizeLocationKind(kind);
  if (publicFacing) {
    return k === "propia"
      ? "Local propio donde se vende el producto."
      : "Punto de entrega o exhibición (vitrina de otro local).";
  }
  return k === "propia"
    ? "Tu panadería: aquí abres caja y usas códigos SRI."
    : "Entregas producto para que vendan; no abre turno de caja.";
}

export function locationKindChipColor(kind) {
  return normalizeLocationKind(kind) === "propia" ? "primary" : "default";
}

/** Orden: propias primero, luego vitrinas; dentro por position. */
export function sortStoresByKind(stores = []) {
  return [...stores].sort((a, b) => {
    const ka = normalizeLocationKind(a.locationKind);
    const kb = normalizeLocationKind(b.locationKind);
    if (ka !== kb) return ka === "propia" ? -1 : 1;
    return Number(a.position || 0) - Number(b.position || 0);
  });
}
