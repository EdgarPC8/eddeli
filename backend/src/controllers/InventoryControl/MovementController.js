// controllers/MovementController.js
import { sequelize } from "../../database/connection.js";
import { verifyJWT, getHeaderToken } from "../../libs/jwt.js";
import { Expense } from "../../models/Finance.js";




import { InventoryMovement, InventoryProduct, InventoryRecipe } from '../../models/Inventory.js';

// controllers/MovementController.js (añade esto)

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

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
        // transformacionesRegistradas: transformaciones, // <-- solo devolvemos en la respuesta
        insumosDescontados: [],
      };

      const fetchP = async (id) => {
        const p = await InventoryProduct.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!p) throw new Error(`Producto ${id} no encontrado`);
        return p;
      };

      const mov = async ({ productId, type, quantity, description }) => {
        return InventoryMovement.create(
          {
            productId,
            type, // "entrada" | "salida" | "produccion" | "ajuste"
            quantity: num(quantity),
            description,
            createdBy: user.accountId,
            date: new Date(),
          },
          { transaction: t }
        );
      };

      // 1) CONSUMO DEL INTERMEDIO (salida)
      {
        const p = await fetchP(intermedio.id);
        const qtyStock = gramsToStockUnits(p, intermedio.gramos);
        const before = num(p.stock);
        const after = before - qtyStock;

        await p.update({ stock: after }, { transaction: t });
        await mov({
          productId: p.id,
          type: "salida",
          quantity: qtyStock,
          description: `Consumo intermedio "${p.name}" (${intermedio.gramos} g). OP:${opId}`,
        });

        resumen.intermedio = { id: p.id, name: p.name, before, after, delta: -qtyStock };
      }

      // 2) ENTRADA DE PRODUCTOS (finales)
      for (const it of productos) {
        const p = await fetchP(it.id);
        const qtyStock = num(it.cantidad); // tu UI envía unidades del producto final
        const before = num(p.stock);
        const after = before + qtyStock;

        await p.update({ stock: after }, { transaction: t });
        await mov({
          productId: p.id,
          type: "entrada",
          quantity: qtyStock,
          description: `Producción "${p.name}" (g/u intermedio: ${num(it.gramosPorUnidadIntermedio || 0)}). OP:${opId}`,
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

      // 3) TRANSFORMACIONES: NO se registran movimientos (evita tipo inválido)
      //    -> Si quieres auditar, las devolvemos en la respuesta:
      // resumen.transformacionesRegistradas = transformaciones;

      // 4) INSUMOS (salidas)
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
          quantity: qtyStock,
          description: `Consumo insumo "${p.name}" (${detalle}). OP:${opId}`,
        });

        resumen.insumosDescontados.push({ id: p.id, name: p.name, before, after, delta: -qtyStock });
      }

      // (opcional) puedes incluir transformaciones en el resumen de respuesta
      if (transformaciones.length) {
        resumen.transformacionesRegistradas = transformaciones;
      }

      return resumen;
    });

    return res.status(200).json({ ok: true, message: "Producción registrada", resumen: out });
  } catch (error) {
    console.error("registerProductionFromPayload error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al registrar producción",
      detail: String(error?.message || error),
    });
  }
};



export const registerProductionFinalFromPayload =async (req, res) => {
      const { productId, quantity,simulated } = req.body;
    const token = getHeaderToken(req);
    const user = await verifyJWT(token); // para createdBy
    let quantityGramos = 0
    console.log("-------------------------------------------------------------------------------------------",req.body)

    if (!productId || !quantity) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const product = await InventoryProduct.findByPk(productId);
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    // Registrar el movimiento principal

    if (!simulated || !simulated.requiere) {
    return res.status(400).json({ message: "Falta estructura de simulación" });
  }

  const procesarNodo = async (nodo, parentName = "") => {
    const cantidad = nodo.cantidadUnidades || nodo.cantidadGramos;
      const prod = await InventoryProduct.findByPk(nodo.id);
    if (nodo.requiere && nodo.requiere.length > 0) {
      for (const sub of nodo.requiere) {
        await procesarNodo(sub, nodo.producto);
      }

      if (nodo.esIntermedio && cantidad > 0) {

        await InventoryMovement.create({
          productId: nodo.id,
          type: "entrada",
          quantity: cantidad,
          description: `Producción intermedia de ${nodo.producto}`,
          createdBy: user.accountId,
        });
        await InventoryMovement.create({
          productId: nodo.id,
          type: "salida",
          quantity: cantidad,
          description: `Consumo de ${nodo.producto} para ${parentName}`,
          createdBy: user.accountId,
        });
        if (prod) {
          prod.stock = nodo.sobrante;
          await prod.save();
        }

      }
    } else {
      if (cantidad > 0) {
        await InventoryMovement.create({
          productId: nodo.id,
          type: "salida",
          quantity: cantidad,
          description: `Consumo de insumo ${nodo.producto} para ${parentName}`,
          createdBy: user.accountId,
        });
           if (prod) {
          prod.stock -= cantidad;
          await prod.save();
        }
      }
    }
  };

  for (const nodo of simulated.requiere) {
    await procesarNodo(nodo, simulated.producto);
  }

  await InventoryMovement.create({
    productId: simulated.id,
    type: "produccion",
    quantity: simulated.cantidadDeseada,
    description: `Producción final de ${simulated.producto}`,
    createdBy: user.accountId,
  });

  product.stock += simulated.cantidadDeseada;
  quantityGramos = simulated.cantidadDeseada;
  await product.save();
    res.status(201).json({ message: "Produccion registrado exitosamente" });

}

// Crear un movimiento y actualizar el stock del producto
export const registerMovement = async (req, res) => {
  try {
    const { productId, type, quantity, description, price,simulated } = req.body;
    const token = getHeaderToken(req);
    const user = await verifyJWT(token); // para createdBy
    let quantityGramos = 0
    // console.log("-------------------------------------------------------------------------------------------",user)

    if (!productId || !type || !quantity) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const product = await InventoryProduct.findByPk(productId);
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    // Registrar el movimiento principal


    // Si es producción, descontar los insumos de la receta
 if (type === "entrada") {
      product.stock =parseFloat(product.stock) + parseFloat(quantity);
      quantityGramos = quantity;

      await Expense.create({
        date: new Date(),
        amount: price, // total gastado
        concept: `Compra de ${product.name}`,
        category: 'Compras',
        referenceId: product.id,
        referenceType: 'inventory_entry',
        createdBy: user.accountId
      });

      await product.save();
    } else if (type === "salida") {
      product.stock -= quantity;
      quantityGramos = quantity;
      await product.save();
    } else if (type === "ajuste") {
      product.stock = quantity; // se ajusta el stock directamente
      quantityGramos = quantity;
      await product.save();
    }

     await InventoryMovement.create({
      productId,
      type,
      quantity:quantityGramos,
      description,
      createdBy:user.accountId
    });

    res.status(201).json({ message: "Movimiento registrado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar movimiento", error });
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
    res.json(movements);
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
    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener todos los movimientos", error });
  }
};
