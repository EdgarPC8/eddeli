// controllers/MovementController.js
import { sequelize } from "../../database/connection.js";
import { verifyJWT, getHeaderToken } from "../../libs/jwt.js";
import { Expense } from "../../models/Finance.js";




import { InventoryMovement, InventoryProduct } from '../../models/Inventory.js';

import { Op, fn, col, literal } from "sequelize";

// helpers
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const PROGRAMMER_ONLY_MSG =
  "Solo el rol Programador puede editar, eliminar movimientos o usar fecha personalizada";

const PRODUCTION_OP_REF_PREFIX = "produccion_op:";

const assertProgrammerRole = (user) => user?.loginRol === "Programador";

/** ID de operación de producción (PR-… / PF-…) desde referenceType o descripción. */
export const extractOperationId = (movement) => {
  const rt = String(movement?.referenceType || "");
  if (rt.startsWith(PRODUCTION_OP_REF_PREFIX)) {
    return rt.slice(PRODUCTION_OP_REF_PREFIX.length);
  }
  const desc = String(movement?.description || "");
  const match = desc.match(/OP:([A-Z]+-\d+-\d+)/);
  return match ? match[1] : null;
};

const productionReferenceType = (opId) => `${PRODUCTION_OP_REF_PREFIX}${opId}`;

/** Fecha del movimiento: ahora para todos; fecha enviada solo si es Programador. */
const resolveMovementDate = (dateInput, user) => {
  if (dateInput != null && dateInput !== "" && assertProgrammerRole(user)) {
    const d = new Date(dateInput);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
};

// GET /inventory/logistics/daily?date=2025-12-24
// o  /inventory/logistics/daily?from=2025-12-24&to=2025-12-24





/**
 * Convierte una cantidad "valor" que viene en GRAMOS a la unidad de stock del producto.
 * - Si el producto se maneja en UNIDADES (unitId === 1): unidades = gramos / standardWeightGrams (si no hay SWG, cae a 1:1 para no romper)
 * - Si el producto se maneja en GRAMOS: devuelve gramos tal cual
 */
function gramsToStockUnits(product, grams) {
  if (product.unitId === 1) {
    const sw = num(product.standardWeightGrams) || 1;
    return num(grams) / sw;
  }
  return num(grams);
}

/**
 * Convierte una cantidad "valor" que viene en UNIDADES a la unidad de stock del producto.
 * - Si el producto se maneja en UNIDADES: devuelve unidades tal cual
 * - Si el producto se maneja en GRAMOS: gramos = unidades * standardWeightGrams (si no hay SWG, cae a 1:1)
 */
function unitsToStockUnits(product, units) {
  if (product.unitId === 1) return num(units);
  const sw = num(product.standardWeightGrams) || 1;
  return num(units) * sw;
}
export const getDailyLogisticsSummary = async (req, res) => {
  try {
    const { date, from, to, productId } = req.query;

    // rango
    let fromDate = from ? new Date(from) : null;
    let toDate = to ? new Date(to) : null;

    if (date && (!fromDate || !toDate)) {
      const d = new Date(date);
      fromDate = startOfDay(d);
      toDate = endOfDay(d);
    }

    // default: hoy
    if (!fromDate || !toDate) {
      const d = new Date();
      fromDate = startOfDay(d);
      toDate = endOfDay(d);
    }

    const where = {
      date: { [Op.between]: [fromDate, toDate] },
    };
    if (productId) where.productId = productId;

    // 1) Totales globales por reason
    const totalsByReason = await InventoryMovement.findAll({
      where,
      attributes: [
        "reason",
        [fn("SUM", col("quantity")), "totalQuantity"],
      ],
      group: ["reason"],
      raw: true,
    });

    // 2) Resumen por producto y reason
    const rows = await InventoryMovement.findAll({
      where,
      attributes: [
        "productId",
        "reason",
        [fn("SUM", col("quantity")), "qty"],
      ],
      group: ["productId", "reason"],
      raw: true,
    });

    // Traer nombres de productos (para mostrar bonito)
    const productIds = [...new Set(rows.map(r => r.productId))];
    const products = await InventoryProduct.findAll({
      where: { id: productIds },
      attributes: ["id", "name", "stock", "unitId"],
      raw: true,
    });
    const prodMap = new Map(products.map(p => [p.id, p]));

    // 3) Pivot por producto
    const initBucket = () => ({
      ENTRADA_PRODUCCION: 0,
      ENTRADA_COMPRA: 0,
      SALIDA_VENTA: 0,
      SALIDA_YAPA: 0,
      SALIDA_DANIADO: 0,
      SALIDA_CADUCADO: 0,
      SALIDA_CONSUMO_INTERNO: 0,
      AJUSTE_ENTRADA: 0,
      AJUSTE_SALIDA: 0,
    });

    const byProduct = new Map();

    for (const r of rows) {
      const pid = r.productId;
      const reason = r.reason || "SIN_REASON";
      const qty = num(r.qty);

      if (!byProduct.has(pid)) {
        byProduct.set(pid, {
          productId: pid,
          name: prodMap.get(pid)?.name || `Producto ${pid}`,
          stockActual: num(prodMap.get(pid)?.stock),
          reasons: initBucket(),
        });
      }
      const obj = byProduct.get(pid);
      if (obj.reasons[reason] === undefined) obj.reasons[reason] = 0;
      obj.reasons[reason] += qty;
    }

    // 4) Métricas derivadas por producto
    const productsSummary = Array.from(byProduct.values()).map(p => {
      const prod = p.reasons.ENTRADA_PRODUCCION;
      const compra = p.reasons.ENTRADA_COMPRA;

      const venta = p.reasons.SALIDA_VENTA;
      const yapa = p.reasons.SALIDA_YAPA;

      const daniado = p.reasons.SALIDA_DANIADO;
      const caducado = p.reasons.SALIDA_CADUCADO;
      const merma = daniado + caducado;

      // % merma sobre producción (común en panadería)
      const baseMerma = prod > 0 ? prod : 0;
      const mermaPct = baseMerma > 0 ? (merma / baseMerma) * 100 : 0;

      return {
        productId: p.productId,
        name: p.name,
        stockActual: p.stockActual,

        producido: prod,
        comprado: compra,
        vendido: venta,
        yapas: yapa,
        daniado,
        caducado,
        merma,
        consumoInterno: p.reasons.SALIDA_CONSUMO_INTERNO,
        ajustesEntrada: p.reasons.AJUSTE_ENTRADA,
        ajustesSalida: p.reasons.AJUSTE_SALIDA,

        mermaPct: Number(mermaPct.toFixed(2)),
      };
    });

    // 5) Totales globales “bonitos”
    const global = {};
    for (const tr of totalsByReason) {
      global[tr.reason || "SIN_REASON"] = num(tr.totalQuantity);
    }
    const globalProducido = num(global.ENTRADA_PRODUCCION);
    const globalMerma = num(global.SALIDA_DANIADO) + num(global.SALIDA_CADUCADO);
    const globalMermaPct = globalProducido > 0 ? (globalMerma / globalProducido) * 100 : 0;

    return res.json({
      ok: true,
      range: { from: fromDate, to: toDate },
      totalsByReason: global,
      globalMetrics: {
        producido: globalProducido,
        vendido: num(global.SALIDA_VENTA),
        yapas: num(global.SALIDA_YAPA),
        daniado: num(global.SALIDA_DANIADO),
        caducado: num(global.SALIDA_CADUCADO),
        merma: globalMerma,
        mermaPct: Number(globalMermaPct.toFixed(2)),
      },
      products: productsSummary.sort((a, b) => (b.merma - a.merma)),
    });
  } catch (error) {
    console.error("getDailyLogisticsSummary error:", error);
    return res.status(500).json({ ok: false, message: "Error en resumen logístico", detail: String(error?.message || error) });
  }
};

export const registerProductionIntermediateFromPayload = async (req, res) => {
  const token = getHeaderToken(req);
  let user = null;
  try {
    user = await verifyJWT(token);
  } catch (e) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const payload = req.body || {};
  const intermedio = payload.intermedio || {};
  const productos = Array.isArray(payload.productos) ? payload.productos : [];
  const transformaciones = Array.isArray(payload.transformaciones) ? payload.transformaciones : [];
  const insumos = Array.isArray(payload.insumos) ? payload.insumos : [];

  if (!intermedio.id || intermedio.gramos === undefined || intermedio.gramos === null) {
    return res.status(400).json({ message: "intermedio.id y intermedio.gramos son requeridos" });
  }

  const opId = `PR-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;

  try {
    const out = await sequelize.transaction(async (t) => {
      const resumen = {
        opId,
        intermedio: null,
        productosAgregados: [],
        insumosDescontados: [],
      };

      const fetchP = async (id) => {
        const p = await InventoryProduct.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!p) throw new Error(`Producto ${id} no encontrado`);
        return p;
      };

      const movementDate = resolveMovementDate(payload.movementDate, user);

      const mov = async ({
        productId,
        type,
        reason,
        quantity,
        description,
        referenceType,
        referenceId,
        price,
      }) => {
        return InventoryMovement.create(
          {
            productId,
            type,
            reason,
            quantity: num(quantity),
            description,
            price: price ?? null,
            referenceType: referenceType ?? productionReferenceType(opId),
            referenceId: referenceId ?? null,
            createdBy: user.accountId,
            date: movementDate,
          },
          { transaction: t }
        );
      };

      // 1) CONSUMO DEL INTERMEDIO (SALIDA)
      {
        const p = await fetchP(intermedio.id);
        const qtyStock = gramsToStockUnits(p, intermedio.gramos);
        const before = num(p.stock);
        const after = before - qtyStock;

        await p.update({ stock: after }, { transaction: t });

        await mov({
          productId: p.id,
          type: "salida",
          reason: "SALIDA_CONSUMO_INTERNO",
          quantity: qtyStock,
          description: `Consumo intermedio "${p.name}" (${intermedio.gramos} g). OP:${opId}`,
        });

        resumen.intermedio = { id: p.id, name: p.name, before, after, delta: -qtyStock };
      }

      // 2) ENTRADA DE PRODUCTOS FINALES (ENTRADA_PRODUCCION)
      for (const it of productos) {
        const p = await fetchP(it.id);
        const qtyStock = num(it.cantidad);
        const before = num(p.stock);
        const after = before + qtyStock;

        await p.update({ stock: after }, { transaction: t });

        await mov({
          productId: p.id,
          type: "entrada",
          reason: "ENTRADA_PRODUCCION",
          quantity: qtyStock,
          description: `Producción "${p.name}". OP:${opId}`,
        });

        resumen.productosAgregados.push({
          id: p.id,
          name: p.name,
          before,
          after,
          delta: qtyStock,
          gramosPorUnidadIntermedio: num(it.gramosPorUnidadIntermedio || 0),
        });
      }

      // 3) INSUMOS (SALIDAS: consumo interno por producción)
      for (const ins of insumos) {
        const p = await fetchP(ins.id);

        let qtyStock = 0;
        let detalle = "";
        if (ins.gramos != null) {
          qtyStock = gramsToStockUnits(p, ins.gramos);
          detalle = `${ins.gramos} g`;
        } else if (ins.unidades != null) {
          qtyStock = unitsToStockUnits(p, ins.unidades);
          detalle = `${ins.unidades} u`;
        } else {
          continue;
        }

        const before = num(p.stock);
        const after = before - qtyStock;

        await p.update({ stock: after }, { transaction: t });

        await mov({
          productId: p.id,
          type: "salida",
          reason: "SALIDA_CONSUMO_INTERNO",
          quantity: qtyStock,
          description: `Consumo insumo "${p.name}" (${detalle}). OP:${opId}`,
        });

        resumen.insumosDescontados.push({ id: p.id, name: p.name, before, after, delta: -qtyStock });
      }

      if (transformaciones.length) {
        resumen.transformacionesRegistradas = transformaciones;
      }

      return resumen;
    });

    return res.status(200).json({ ok: true, message: "Producción registrada", resumen: out });
  } catch (error) {
    console.error("registerProductionIntermediateFromPayload error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al registrar producción",
      detail: String(error?.message || error),
    });
  }
};
export const registerProductionFinalFromPayload = async (req, res) => {
  const { productId, quantity, simulated, movementDate } = req.body;

  const token = getHeaderToken(req);
  let user = null;
  try {
    user = await verifyJWT(token);
  } catch (e) {
    return res.status(401).json({ message: "No autorizado" });
  }

  if (!productId || !quantity) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  if (!simulated || !simulated.requiere) {
    return res.status(400).json({ message: "Falta estructura de simulación" });
  }

  const finalProduct = await InventoryProduct.findByPk(productId);
  if (!finalProduct) return res.status(404).json({ message: "Producto no encontrado" });

  const opId = `PF-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
  const prodMovementDate = resolveMovementDate(movementDate, user);

  try {
    await sequelize.transaction(async (t) => {
      const fetchP = async (id) => {
        const p = await InventoryProduct.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!p) throw new Error(`Producto ${id} no encontrado`);
        return p;
      };

      const mov = async ({
        productId,
        type,
        reason,
        quantity,
        description,
        referenceType,
        referenceId,
        price,
      }) => {
        return InventoryMovement.create(
          {
            productId,
            type,
            reason,
            quantity: num(quantity),
            description,
            price: price ?? null,
            referenceType: referenceType ?? productionReferenceType(opId),
            referenceId: referenceId ?? null,
            createdBy: user.accountId,
            date: prodMovementDate,
          },
          { transaction: t }
        );
      };

      const procesarNodo = async (nodo, parentName = "") => {
        const prod = await fetchP(nodo.id);

        // Determinar cantidad en "unidad de stock" del producto
        // - Si nodo trae cantidadGramos -> convertir según unidad del producto
        // - Si trae cantidadUnidades -> convertir según unidad del producto
        let qtyStock = 0;
        let detalle = "";

        if (nodo.cantidadGramos != null) {
          qtyStock = gramsToStockUnits(prod, nodo.cantidadGramos);
          detalle = `${nodo.cantidadGramos} g`;
        } else if (nodo.cantidadUnidades != null) {
          qtyStock = unitsToStockUnits(prod, nodo.cantidadUnidades);
          detalle = `${nodo.cantidadUnidades} u`;
        } else {
          return;
        }

        if (nodo.requiere && nodo.requiere.length > 0) {
          // primero procesa hijos
          for (const sub of nodo.requiere) {
            await procesarNodo(sub, nodo.producto);
          }

          // si es intermedio, registras entrada + salida (traza) y ajustas sobrante
          if (nodo.esIntermedio && qtyStock > 0) {
            await mov({
              productId: nodo.id,
              type: "entrada",
              reason: "ENTRADA_PRODUCCION",
              quantity: qtyStock,
              description: `Producción intermedia de ${nodo.producto}. OP:${opId}`,
            });

            await mov({
              productId: nodo.id,
              type: "salida",
              reason: "SALIDA_CONSUMO_INTERNO",
              quantity: qtyStock,
              description: `Consumo de ${nodo.producto} para ${parentName}. OP:${opId}`,
            });

            // sobrante viene del simulador: debería estar en unidad de stock del intermedio
            if (nodo.sobrante != null) {
              prod.stock = num(nodo.sobrante);
              await prod.save({ transaction: t });
            }
          }
        } else {
          // insumo final: salida
          if (qtyStock > 0) {
            const before = num(prod.stock);
            prod.stock = before - qtyStock;
            await prod.save({ transaction: t });

            await mov({
              productId: nodo.id,
              type: "salida",
              reason: "SALIDA_CONSUMO_INTERNO",
              quantity: qtyStock,
              description: `Consumo de insumo ${nodo.producto} (${detalle}) para ${parentName}. OP:${opId}`,
            });
          }
        }
      };

      for (const nodo of simulated.requiere) {
        await procesarNodo(nodo, simulated.producto);
      }

      // Movimiento principal de producción final (ENTRADA_PRODUCCION)
      await mov({
        productId: simulated.id,
        type: "produccion",
        reason: "ENTRADA_PRODUCCION",
        quantity: simulated.cantidadDeseada,
        description: `Producción final de ${simulated.producto}. OP:${opId}`,
      });

      // subir stock del producto final
      finalProduct.stock = num(finalProduct.stock) + num(simulated.cantidadDeseada);
      await finalProduct.save({ transaction: t });
    });

    return res.status(201).json({ ok: true, message: "Producción registrada exitosamente" });
  } catch (error) {
    console.error("registerProductionFinalFromPayload error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al registrar producción",
      detail: String(error?.message || error),
    });
  }
};


// =============================================================================
// POST /inventory/movements — registerMovement
// Cada `type` aplica una regla distinta sobre `InventoryProduct.stock`.
// Documentado por separado para mantener y extender (p. ej. nuevos motivos).
// =============================================================================

const MOVEMENT_TYPES = ["entrada", "salida", "ajuste", "produccion"];

/** Motivos de ajuste permitidos en BD (ENUM en Inventory.js). El front puede enviar AJUSTE_INVENTARIO; aquí se normaliza. */
const AJUSTE_REASONS_DB = new Set(["AJUSTE_ENTRADA", "AJUSTE_SALIDA"]);

/**
 * ENTRADA: suma cantidad al stock (compras, devoluciones, otras entradas).
 * @param {import("sequelize").Model} product InventoryProduct
 * @param {number} qtyDelta cantidad a sumar (>= 0 esperado)
 */
async function applyMovementEntrada(product, qtyDelta, transaction) {
  product.stock = parseFloat(product.stock) + qtyDelta;
  await product.save({ transaction });
}

/**
 * PRODUCCIÓN: mismo efecto contable que entrada — incrementa stock del producto fabricado.
 * (El desglose de insumos va por otros flujos: registerProductionFinalFromPayload, etc.)
 */
async function applyMovementProduccion(product, qtyDelta, transaction) {
  product.stock = parseFloat(product.stock) + qtyDelta;
  await product.save({ transaction });
}

/**
 * SALIDA: resta cantidad del stock (venta, consumo interno, merma, etc.)
 */
async function applyMovementSalida(product, qtyDelta, transaction) {
  product.stock = parseFloat(product.stock) - qtyDelta;
  await product.save({ transaction });
}

/**
 * AJUSTE: `nuevoStockAbsoluto` reemplaza el stock (inventario físico / conteo).
 * No es un delta: el front envía el valor final deseado en `quantity`.
 */
async function applyMovementAjuste(product, nuevoStockAbsoluto, transaction) {
  product.stock = nuevoStockAbsoluto;
  await product.save({ transaction });
}

/**
 * El modelo Sequelize solo tiene AJUSTE_ENTRADA y AJUSTE_SALIDA.
 * El front (MovementForm) manda `AJUSTE_INVENTARIO` para “ajuste de inventario genérico”.
 * Derivamos el motivo según si el stock sube, baja o iguala (para reportes/logística).
 */
function resolveAjusteReasonForDb(reasonIncoming, stockAnterior, stockNuevo) {
  if (reasonIncoming && AJUSTE_REASONS_DB.has(reasonIncoming)) {
    return reasonIncoming;
  }
  if (stockNuevo > stockAnterior) return "AJUSTE_ENTRADA";
  if (stockNuevo < stockAnterior) return "AJUSTE_SALIDA";
  return "AJUSTE_ENTRADA";
}

/**
 * Registra gasto en finanzas solo cuando es compra con monto (entrada + ENTRADA_COMPRA).
 */
async function registerExpenseCompraSiAplica({ product, reason, priceTotal, accountId, transaction }) {
  if (reason !== "ENTRADA_COMPRA" || priceTotal == null || Number.isNaN(Number(priceTotal))) {
    return;
  }
  await Expense.create(
    {
      date: new Date(),
      amount: priceTotal,
      concept: `Compra de ${product.name}`,
      category: "Compras",
      referenceId: product.id,
      referenceType: "inventory_entry",
      createdBy: accountId,
    },
    { transaction },
  );
}

/**
 * Crea la fila en ERP_inventory_movements (auditoría).
 * `quantity` en ajuste = stock final absoluto (misma semántica que antes).
 */
async function createInventoryMovementRow(
  {
    productId,
    type,
    reason,
    quantity,
    description,
    price,
    referenceType,
    referenceId,
    createdBy,
    date,
  },
  transaction,
) {
  return InventoryMovement.create(
    {
      productId,
      type,
      reason,
      quantity,
      description,
      price: price ?? null,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      createdBy,
      date: date ?? new Date(),
    },
    { transaction },
  );
}

/** Alias usados en el front que deben mapear a valores válidos del ENUM. */
const REASON_ALIASES = {
  SALIDA_CONSUMO: "SALIDA_CONSUMO_INTERNO",
  SALIDA_MERMA: "SALIDA_DANIADO",
  PRODUCCION_FINAL: "ENTRADA_PRODUCCION",
  ENTRADA_DEVOLUCION: "ENTRADA_COMPRA",
};

function normalizeMovementReason(type, reason, stockAntes, stockNuevo) {
  if (type === "ajuste") {
    return resolveAjusteReasonForDb(reason || "AJUSTE_INVENTARIO", stockAntes, stockNuevo);
  }
  return REASON_ALIASES[reason] || reason;
}

/** Recalcula stock del producto según todos sus movimientos (orden cronológico). */
async function syncProductStockFromMovements(productId, transaction) {
  const movements = await InventoryMovement.findAll({
    where: { productId },
    order: [
      ["date", "ASC"],
      ["id", "ASC"],
    ],
    transaction,
  });

  let stock = 0;
  for (const m of movements) {
    const qty = num(m.quantity);
    if (m.type === "entrada" || m.type === "produccion") stock += qty;
    else if (m.type === "salida") stock -= qty;
    else if (m.type === "ajuste") stock = qty;
  }

  const product = await InventoryProduct.findByPk(productId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!product) throw new Error("Producto no encontrado");
  await product.update({ stock }, { transaction });
  return stock;
}

// Crear un movimiento y actualizar el stock del producto
export const registerMovement = async (req, res) => {
  try {
    const {
      productId,
      type,
      reason,
      quantity,
      description,
      price,
      referenceType,
      referenceId,
      date: movementDateInput,
    } = req.body;

    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    if (movementDateInput != null && movementDateInput !== "" && !assertProgrammerRole(user)) {
      return res.status(403).json({ message: PROGRAMMER_ONLY_MSG });
    }

    if (!productId || !type || quantity == null) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    if (!MOVEMENT_TYPES.includes(type)) {
      return res.status(400).json({ message: `type inválido. Use: ${MOVEMENT_TYPES.join(", ")}` });
    }

    const qty = parseFloat(quantity);
    if (Number.isNaN(qty)) {
      return res.status(400).json({ message: "quantity no numérica" });
    }

    // reason obligatorio salvo ajuste (se infiere / normaliza)
    if (type !== "ajuste" && !reason) {
      return res.status(400).json({ message: "Falta reason (motivo del movimiento)" });
    }

    await sequelize.transaction(async (t) => {
      const product = await InventoryProduct.findByPk(productId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!product) {
        const err = new Error("Producto no encontrado");
        err.statusCode = 404;
        throw err;
      }

      const stockAntes = parseFloat(product.stock) || 0;
      const reasonParaDb = normalizeMovementReason(type, reason, stockAntes, qty);

      if (type === "entrada") {
        await applyMovementEntrada(product, qty, t);
      } else if (type === "produccion") {
        await applyMovementProduccion(product, qty, t);
      } else if (type === "salida") {
        await applyMovementSalida(product, qty, t);
      } else if (type === "ajuste") {
        await applyMovementAjuste(product, qty, t);
      }

      if (type === "entrada") {
        await registerExpenseCompraSiAplica({
          product,
          reason: reasonParaDb,
          priceTotal: price,
          accountId: user.accountId,
          transaction: t,
        });
      }

      const priceParaDb = type === "ajuste" ? null : price ?? null;

      await createInventoryMovementRow(
        {
          productId,
          type,
          reason: reasonParaDb,
          quantity: qty,
          description,
          price: priceParaDb,
          referenceType,
          referenceId,
          createdBy: user.accountId,
          date: resolveMovementDate(movementDateInput, user),
        },
        t,
      );
    });

    res.status(201).json({ message: "Movimiento registrado exitosamente" });
  } catch (error) {
    const status = error?.statusCode || 500;
    const message =
      status === 500
        ? error?.message || "Error al registrar movimiento"
        : error?.message || "Error al registrar movimiento";
    res.status(status).json({ message, error: String(error?.message || error) });
  }
};

/** PUT /inventory/movements/:movementId — solo Programador */
export const updateMovement = async (req, res) => {
  try {
    const { movementId } = req.params;
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    if (!assertProgrammerRole(user)) {
      return res.status(403).json({ message: PROGRAMMER_ONLY_MSG });
    }

    const {
      type,
      reason,
      quantity,
      description,
      price,
      referenceType,
      referenceId,
      date: movementDateInput,
    } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const movement = await InventoryMovement.findByPk(movementId, { transaction: t });
      if (!movement) return { status: 404, body: { message: "Movimiento no encontrado" } };

      const productId = movement.productId;

      if (type != null && !MOVEMENT_TYPES.includes(type)) {
        return { status: 400, body: { message: "type inválido" } };
      }

      const nextType = type ?? movement.type;
      const nextQty =
        quantity != null ? parseFloat(quantity) : parseFloat(movement.quantity);
      if (Number.isNaN(nextQty)) {
        return { status: 400, body: { message: "quantity no numérica" } };
      }

      let nextReason = reason ?? movement.reason;
      if (nextType === "ajuste") {
        const product = await InventoryProduct.findByPk(productId, { transaction: t });
        const stockAntes = parseFloat(product?.stock) || 0;
        nextReason = resolveAjusteReasonForDb(
          nextReason || "AJUSTE_INVENTARIO",
          stockAntes,
          nextQty
        );
      }

      if (movementDateInput != null) {
        movement.date = resolveMovementDate(movementDateInput, user);
      }
      movement.type = nextType;
      movement.reason = nextReason;
      movement.quantity = nextQty;
      if (description != null) movement.description = description;
      if (nextType === "ajuste") {
        movement.price = null;
      } else if (price !== undefined) {
        movement.price = price == null ? null : Number(price);
      }
      if (referenceType !== undefined) movement.referenceType = referenceType;
      if (referenceId !== undefined) movement.referenceId = referenceId;

      await movement.save({ transaction: t });
      await syncProductStockFromMovements(productId, t);

      return {
        status: 200,
        body: { message: "Movimiento actualizado", movement: movement.toJSON() },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("updateMovement:", error);
    return res.status(500).json({
      message: "Error al actualizar movimiento",
      error: String(error?.message || error),
    });
  }
};

/** PUT /inventory/movements/batch/date — fecha grupal (producción u otros ids) */
export const updateMovementsDateBatch = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    if (!assertProgrammerRole(user)) {
      return res.status(403).json({ message: PROGRAMMER_ONLY_MSG });
    }

    const { movementIds, operationId, date: movementDateInput } = req.body;

    if (!movementDateInput) {
      return res.status(400).json({ message: "Falta date" });
    }

    const result = await sequelize.transaction(async (t) => {
      let targets = [];

      if (Array.isArray(movementIds) && movementIds.length > 0) {
        targets = await InventoryMovement.findAll({
          where: { id: { [Op.in]: movementIds.map(Number) } },
          transaction: t,
        });
      } else if (operationId) {
        const all = await InventoryMovement.findAll({ transaction: t });
        targets = all.filter((m) => extractOperationId(m) === String(operationId));
      } else {
        return { status: 400, body: { message: "Indica movementIds u operationId" } };
      }

      if (targets.length === 0) {
        return { status: 404, body: { message: "No hay movimientos para actualizar" } };
      }

      const newDate = resolveMovementDate(movementDateInput, user);
      const productIds = new Set();

      for (const movement of targets) {
        movement.date = newDate;
        await movement.save({ transaction: t });
        productIds.add(movement.productId);
      }

      for (const productId of productIds) {
        await syncProductStockFromMovements(productId, t);
      }

      return {
        status: 200,
        body: {
          message: "Fechas actualizadas",
          updatedCount: targets.length,
          operationId: operationId || null,
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("updateMovementsDateBatch:", error);
    return res.status(500).json({
      message: "Error al actualizar fechas",
      error: String(error?.message || error),
    });
  }
};

/** DELETE /inventory/movements/:movementId — solo Programador */
export const deleteMovement = async (req, res) => {
  try {
    const { movementId } = req.params;
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    if (!assertProgrammerRole(user)) {
      return res.status(403).json({ message: PROGRAMMER_ONLY_MSG });
    }

    const result = await sequelize.transaction(async (t) => {
      const movement = await InventoryMovement.findByPk(movementId, { transaction: t });
      if (!movement) return { status: 404, body: { message: "Movimiento no encontrado" } };

      const productId = movement.productId;
      await movement.destroy({ transaction: t });
      await syncProductStockFromMovements(productId, t);

      return {
        status: 200,
        body: { message: "Movimiento eliminado", movementId: Number(movementId) },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("deleteMovement:", error);
    return res.status(500).json({
      message: "Error al eliminar movimiento",
      error: String(error?.message || error),
    });
  }
};

// Obtener movimientos por producto
export const getMovementsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const movements = await InventoryMovement.findAll({
      where: { productId },
      order: [['date', 'DESC']]
    });
    
    // Formatear fechas correctamente antes de enviar
    const formattedMovements = movements.map(movement => {
      const movementData = movement.toJSON();
      if (movementData.date) {
        const date = new Date(movementData.date);
        if (!isNaN(date.getTime())) {
          movementData.date = date.toISOString();
        }
      }
      return movementData;
    });
    
    res.json(formattedMovements);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener movimientos", error });
  }
};

export const getAllMovements = async (req, res) => {
  try {
    const movements = await InventoryMovement.findAll({
      include: [
        { model: InventoryProduct, attributes: ["id", "name"] }
      ],
      order: [['date', 'DESC']]
    });
    
    // Formatear fechas correctamente antes de enviar
    const formattedMovements = movements.map(movement => {
      const movementData = movement.toJSON();
      if (movementData.date) {
        // Asegurar que la fecha esté en formato ISO completo
        const date = new Date(movementData.date);
        if (!isNaN(date.getTime())) {
          movementData.date = date.toISOString();
        }
      }
      return movementData;
    });
    
    res.json(formattedMovements);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener todos los movimientos", error });
  }
};
