/** Extrae OP:PR-… / OP:PF-… de un movimiento (referenceType o descripción). */
export function extractOperationId(movement) {
  const rt = String(movement?.referenceType || "");
  if (rt.startsWith("produccion_op:")) return rt.slice("produccion_op:".length);
  const desc = String(movement?.description || "");
  const match = desc.match(/OP:([A-Z]+-\d+-\d+)/);
  return match ? match[1] : null;
}

export function productionGroupLabel(opId) {
  if (!opId) return "Producción";
  if (opId.startsWith("PF-")) return "Producción final";
  if (opId.startsWith("PR-")) return "Producción intermedia";
  return "Producción";
}

/**
 * Separa movimientos en grupos de producción (misma OP) y sueltos.
 * @returns {{ productionGroups: Array, standalone: Array }}
 */
export function groupMovements(movements) {
  const byOp = new Map();
  const standalone = [];

  for (const m of movements || []) {
    const opId = extractOperationId(m);
    if (opId) {
      if (!byOp.has(opId)) byOp.set(opId, []);
      byOp.get(opId).push(m);
    } else {
      standalone.push(m);
    }
  }

  const productionGroups = Array.from(byOp.entries())
    .map(([opId, items]) => {
      const sorted = items.slice().sort((a, b) => Number(a.id) - Number(b.id));
      return {
        opId,
        label: productionGroupLabel(opId),
        items: sorted,
        date: sorted[0]?.date,
        movementIds: sorted.map((x) => x.id),
      };
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  standalone.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return { productionGroups, standalone };
}
