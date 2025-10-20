import { InventoryRecipe,InventoryProduct } from "../../models/Inventory.js";

// controllers/RecipeController.js

/**
 * GET /recipes/:productFinalId/costing?extrasPercent=0.2&laborCost=0&producedQty=0
 *
 * - extrasPercent: porcentaje adicional (ej. 0.2 = 20%) aplicado sobre el subtotal de insumos (opcional, default 0)
 * - laborCost: costo de mano de obra para el lote (opcional, default 0)
 * - producedQty: cantidad producida (unidades finales) para calcular costo unitario (opcional)
 */
export const getRecipeCosting2 = async (req, res) => {
  try {
    const { productFinalId } = req.params;

    // Porcentajes como ENTEROS (0..100). Si no llegan, 0.
    const toPctInt = (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 0 ? Math.min(n, 100) : 0;
    };

    const extrasPctInt = toPctInt(req.query.extrasPercent);  // ej: 20
    const laborPctInt  = toPctInt(req.query.laborPercent);   // ej: 45
    const producedQty  = Number.isFinite(Number(req.query.producedQty))
      ? Number(req.query.producedQty)
      : 0;

    // Convertimos a decimal internamente
    const extrasPercent = extrasPctInt / 100;
    const laborPercent  = laborPctInt / 100;

    const items = await InventoryRecipe.findAll({
      where: { productFinalId },
      include: [
        {
          model: InventoryProduct,
          as: "rawProduct",
          attributes: [
            "id", "name", "price", "netWeight",
            "standardWeightGrams", "unitId", "type",
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    const rows = [];
    let subtotalInsumos = 0;
    let subtotalMateriales = 0;
    let totalPesoEnMasa = 0;
    let totalUnidadesMaterial = 0;

    const safeDiv = (a, b) => (b > 0 ? a / b : 0);

    for (const it of items) {
      const rp = it.rawProduct || {};
      const nombre = rp.name || "(sin nombre)";
      const precioNeto = Number(rp.price || 0);   // $ por empaque
      const pesoNeto   = Number(rp.netWeight || 0); // g (insumo) o unidades por empaque (material)
      const stdGr      = Number(rp.standardWeightGrams || 0);
      const cantidad   = Number(it.quantity || 0);
      const isGr       = !!it.isQuantityInGrams;
      const itemType   = it.itemType || "insumo"; // 'insumo' | 'material'

      if (itemType === "material") {
        // MATERIAL: $ por unidad (netWeight = #unidades por empaque)
        const precioPorUnidad = safeDiv(precioNeto, pesoNeto);
        const unidadesUsadas  = cantidad;
        const valor = precioPorUnidad * unidadesUsadas;

        subtotalMateriales += valor;
        totalUnidadesMaterial += unidadesUsadas;

        rows.push({
          nombre,
          tipo: "material",
          precioNeto,
          pesoNeto,
          cantidadUsada: unidadesUsadas,
          precioUnitBase: precioPorUnidad,
          valor: Number(valor.toFixed(6)),
          notas: "Valorado por unidad (price/netWeight * unidades)",
        });
      } else {
        // INSUMO: $ por gramo
        const precioPorGramo = safeDiv(precioNeto, pesoNeto);
        const gramosUsados   = isGr ? cantidad : cantidad * stdGr;
        const valor = precioPorGramo * gramosUsados;

        subtotalInsumos += valor;
        totalPesoEnMasa += gramosUsados;

        rows.push({
          nombre,
          tipo: "insumo",
          precioNeto,
          pesoNeto,
          pesoEnMasa: gramosUsados,
          precioUnitBase: precioPorGramo,
          valor: Number(valor.toFixed(6)),
          isQuantityInGrams: isGr,
          standardWeightGrams: stdGr,
          notas: isGr ? "Cantidad en gramos" : `Unidades x ${stdGr} g/un = gramos`,
        });
      }
    }

    // Informativo (insumos + materiales)
    const subtotalTodos = subtotalInsumos + subtotalMateriales;

    // === LÓGICA PEDIDA (solo con porcentajes enteros) ===
    const extras       = subtotalInsumos * extrasPercent;             // % sobre INSUMOS
    const baseConExtras = subtotalInsumos + extras;                    // INSUMOS + EXTRAS
    const labor        = baseConExtras * laborPercent;                // % sobre (INSUMOS + EXTRAS)
    const totalLote    = baseConExtras + labor;                       // Total del lote

    const costoUnitario = producedQty > 0 ? totalLote / producedQty : 0;

    const summary = {
      totales: {
        // Informativos
        subtotalInsumos: Number(subtotalInsumos.toFixed(2)),
        subtotalMateriales: Number(subtotalMateriales.toFixed(2)),
        subtotal: Number(subtotalTodos.toFixed(2)),

        // Porcentajes (enteros) y resultados
        extrasPercentInt: extrasPctInt,           // ej: 20
        extras: Number(extras.toFixed(2)),
        baseConExtras: Number(baseConExtras.toFixed(2)),

        laborPercentInt: laborPctInt,             // ej: 45
        labor: Number(labor.toFixed(2)),

        totalLote: Number(totalLote.toFixed(2)),
        producedQty,
        costoUnitario: Number(costoUnitario.toFixed(4)),
      },
      acumulados: {
        totalPesoEnMasaGr: Number(totalPesoEnMasa.toFixed(2)),
        totalUnidadesMaterial: Number(totalUnidadesMaterial.toFixed(2)),
      },
      notas: "Extras = % de insumos; Mano de obra = % de (insumos + extras). Materiales no entran en la base.",
    };

    return res.json({ rows, summary });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al calcular costeo de receta", error });
  }
};
// controllers/costingController.js
// GET /api/inventory/recipes/:productFinalId/costing-tree?extrasPercent=20&laborPercent=45&producedQty=100


export const getRecipeCosting = async (req, res) => {
  try {
    const productFinalId = Number(req.params.productFinalId);
    if (!Number.isFinite(productFinalId) || productFinalId <= 0) {
      return res.status(400).json({ message: "productFinalId inválido" });
    }

    // --- Params / Query ---
    const toPctInt = (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 0 ? Math.min(n, 100) : 0;
    };
    const extrasPctInt = toPctInt(req.query.extrasPercent);
    const laborPctInt  = toPctInt(req.query.laborPercent);
    const producedQty  = Number.isFinite(Number(req.query.producedQty))
      ? Number(req.query.producedQty)
      : 0;

    const extrasPercent = extrasPctInt / 100;
    const laborPercent  = laborPctInt  / 100;

    // --- Helpers ---
    const safeDiv = (a, b) => (b > 0 ? a / b : 0);

    const fetchProduct = async (id) => {
      const p = await InventoryProduct.findByPk(id);
      if (!p) throw new Error(`Producto ${id} no encontrado`);
      return p;
    };

    const fetchRecipe = async (finalId) => {
      return InventoryRecipe.findAll({
        where: { productFinalId: finalId },
        order: [["id", "ASC"]],
      });
    };

    // Rendimiento en gramos “base” del producto (para escalar recetas en productos por gramos)
    const computeProducedGrams = async (productId) => {
      const p = await fetchProduct(productId);
      if (Number(p.productionYieldGrams) > 0) return Number(p.productionYieldGrams);

      const receta = await fetchRecipe(productId);
      if (!receta.length) return 0;

      let sumaGramos = 0;
      for (const it of receta) {
        const ins = await fetchProduct(it.productRawId);
        const qty  = Number(it.quantity) || 0;
        const isGr = !!it.isQuantityInGrams;

        if (isGr) {
          sumaGramos += qty;
        } else {
          const std = Number(ins.standardWeightGrams || 0);
          if (ins.unitId === 1) {
            // insumo unitario con peso estándar
            sumaGramos += qty * std;
          } else if (std > 0) {
            // una “unidad lógica” en receta equivale a std gramos (si existe)
            sumaGramos += qty * std;
          }
        }
      }
      return sumaGramos;
    };

    /**
     * Construye el nodo de costeo (árbol) para productId escalado por "mult":
     * - Si unitId === 1 → mult = unidades solicitadas.
     * - Si unitId !== 1 → mult = gramos solicitados.
     */
    const buildCostNode = async (productId, mult = 1, path = []) => {
      const p = await fetchProduct(productId);
      const unidad = p.unitId === 1 ? "unidad" : "gramos";

      const node = {
        info: { id: p.id, nombre: p.name, type: p.type, unitId: p.unitId, unidad, mult: Number(mult) || 1 },
        children: [],
        cost: {
          subtotalInsumos: 0,
          subtotalMateriales: 0,
          totalPesoEnMasaGr: 0,        // solo insumos (g)
          totalUnidadesMaterial: 0,    // solo materiales (u)
          totalNodo: 0,                // se calcula al final
          unitCost: 0,                 // se calcula al final
          unitCostLabel: p.unitId === 1 ? "/u" : "/g",
        },
        rows: [],          // plano acumulado del subárbol
        directItems: [],   // detalle directo tipo “Excel” del nodo actual
        directSubtotal: {  // sumatorias solo de directItems (no incluye hijos)
          totalPesoEnMasaGr: 0,
          totalUnidadesMaterial: 0,
          totalValor: 0,
        },
      };

      const receta = await fetchRecipe(productId);
      if (!receta.length) return finalizeNode(node);

      const producedGrams = p.unitId === 1 ? 1 : (await computeProducedGrams(productId) || 0);

      for (const it of receta) {
        const raw = await fetchProduct(it.productRawId);
        const nombre = raw.name;
        const isMaterial = (it.itemType || "insumo") === "material";
        const qty  = Number(it.quantity) || 0;
        const isGr = !!it.isQuantityInGrams;

        // Escala de consumo heredada desde el padre
        const scale = p.unitId === 1 ? mult : (producedGrams > 0 ? mult / producedGrams : 0);
        const baseQty = qty * scale; // en unidades o gramos según la receta

        // --- Hojas (insumo/material directo) ---
        if (raw.type !== "intermediate") {
          if (isMaterial) {
            // Material: costo por unidad
            const unidadesUsadas     = baseQty;
            const precioNeto         = Number(raw.price || 0);   // $ por empaque
            const unidadesPorEmpaque = Number(raw.netWeight || 0);
            const precioPorUnidad    = safeDiv(precioNeto, unidadesPorEmpaque);
            const valor              = precioPorUnidad * unidadesUsadas;

            // Acumular en nodo (totales del subárbol)
            node.cost.subtotalMateriales    += valor;
            node.cost.totalUnidadesMaterial += unidadesUsadas;

            // Acumular “direct subtotal” (solo del nodo actual)
            node.directSubtotal.totalUnidadesMaterial += unidadesUsadas;
            node.directSubtotal.totalValor            += valor;

            // Direct item estilo Excel
            node.directItems.push({
              nombre,
              tipo: "material",
              unidadBase: "unidad",
              consumo: unidadesUsadas,        // unidades
              precioNeto,                     // $ empaque
              pesoNeto: unidadesPorEmpaque,   // u por empaque
              pesoEnMasa: unidadesUsadas,     // para mantener columna homogénea
              precioUnitBase: precioPorUnidad,
              valor: Number(valor.toFixed(6)),
            });

            // Fila plana
            node.rows.push({
              path: [...path, p.name, nombre].join(" > "),
              productoFinalId: p.id,
              nombreProductoFinal: p.name,
              nombreInsumo: nombre,
              tipo: "material",
              precioNeto,
              pesoNeto: unidadesPorEmpaque,
              cantidadUsada: unidadesUsadas,
              precioUnitBase: precioPorUnidad,
              valor: Number(valor.toFixed(6)),
              notas: "Material: price/netWeight * unidades",
            });
          } else {
            // Insumo: costo por gramo
            let gramosUsados = 0;
            if (isGr) {
              gramosUsados = baseQty;
            } else {
              const std = Number(raw.standardWeightGrams || 0); // g/und
              gramosUsados = baseQty * std; // unidades → gramos
            }

            const precioNeto     = Number(raw.price || 0);  // $ por empaque
            const pesoNetoGramos = Number(raw.netWeight || 0); // g por empaque
            const precioPorGramo = safeDiv(precioNeto, pesoNetoGramos);
            const valor          = precioPorGramo * gramosUsados;

            // Acumular en nodo (totales del subárbol)
            node.cost.subtotalInsumos   += valor;
            node.cost.totalPesoEnMasaGr += gramosUsados;

            // Acumular “direct subtotal”
            node.directSubtotal.totalPesoEnMasaGr += gramosUsados;
            node.directSubtotal.totalValor        += valor;

            // Direct item estilo Excel
            node.directItems.push({
              nombre,
              tipo: "insumo",
              unidadBase: "gramos",
              consumo: gramosUsados,             // gramos
              precioNeto,                        // $ empaque
              pesoNeto: pesoNetoGramos,          // g por empaque
              pesoEnMasa: gramosUsados,          // lo usado en la receta
              precioUnitBase: precioPorGramo,    // $/g
              valor: Number(valor.toFixed(6)),
              isQuantityInGrams: isGr,
              standardWeightGrams: Number(raw.standardWeightGrams || 0),
            });

            // Fila plana
            node.rows.push({
              path: [...path, p.name, nombre].join(" > "),
              productoFinalId: p.id,
              nombreProductoFinal: p.name,
              nombreInsumo: nombre,
              tipo: "insumo",
              precioNeto,
              pesoNeto: pesoNetoGramos,
              pesoEnMasa: gramosUsados,
              precioUnitBase: precioPorGramo,
              valor: Number(valor.toFixed(6)),
              isQuantityInGrams: isGr,
              standardWeightGrams: Number(raw.standardWeightGrams || 0),
              notas: isGr ? "Cantidad en gramos" : "Unidades → gramos (stdWeight)",
            });
          }
          continue;
        }

        // --- Intermedio: recursión ---
        let childMult = 0;
        if (raw.unitId === 1) {
          // hijo en unidades
          if (isGr) {
            const std = Number(raw.standardWeightGrams || 0);
            childMult = std > 0 ? baseQty / std : 0; // gramos → unidades
          } else {
            childMult = baseQty; // ya unidades
          }
        } else {
          // hijo en gramos
          if (isGr) {
            childMult = baseQty; // ya gramos
          } else {
            const std = Number(raw.standardWeightGrams || 0);
            childMult = baseQty * std; // unidades → gramos
          }
        }

        const childNode = await buildCostNode(raw.id, childMult, [...path, p.name]);
        node.children.push(childNode);

        // Acumular costos del hijo al nodo actual
        node.cost.subtotalInsumos       += childNode.cost.subtotalInsumos;
        node.cost.subtotalMateriales    += childNode.cost.subtotalMateriales;
        node.cost.totalPesoEnMasaGr     += childNode.cost.totalPesoEnMasaGr;
        node.cost.totalUnidadesMaterial += childNode.cost.totalUnidadesMaterial;

        node.rows.push(...childNode.rows);
      }

      return finalizeNode(node);
    };

    // Completa totales y unitarios del nodo
    const finalizeNode = (node) => {
      const totalNodo = node.cost.subtotalInsumos + node.cost.subtotalMateriales;
      node.cost.totalNodo = Number(totalNodo.toFixed(6));

      const denom = Number(node.info.mult) || 0;
      node.cost.unitCost = denom > 0 ? Number((totalNodo / denom).toFixed(6)) : 0;

      // Redondeos de subtotales directos
      node.directSubtotal.totalPesoEnMasaGr     = Number(node.directSubtotal.totalPesoEnMasaGr.toFixed(6));
      node.directSubtotal.totalUnidadesMaterial = Number(node.directSubtotal.totalUnidadesMaterial.toFixed(6));
      node.directSubtotal.totalValor            = Number(node.directSubtotal.totalValor.toFixed(6));

      return node;
    };

    // --- Construcción raíz ---
    const product = await fetchProduct(productFinalId);
    const rootMult = product.unitId === 1 ? (producedQty || 1) : (producedQty || 0);
    const tree = await buildCostNode(productFinalId, rootMult || 1, []);

    // --- Aplanado y totales globales ---
    const rows = tree.rows;

    const subtotalInsumos    = Number(tree.cost.subtotalInsumos.toFixed(2));
    const subtotalMateriales = Number(tree.cost.subtotalMateriales.toFixed(2));
    const subtotalTodos      = Number((subtotalInsumos + subtotalMateriales).toFixed(2));

    const extras        = subtotalInsumos * extrasPercent;     // sobre INSUMOS
    const baseConExtras = subtotalInsumos + extras;
    const labor         = baseConExtras * laborPercent;        // sobre (INSUMOS + EXTRAS)
    const totalLote     = baseConExtras + labor;

    const costoUnitario = producedQty > 0 ? Number((totalLote / producedQty).toFixed(4)) : 0;

    const summary = {
      totales: {
        subtotalInsumos,
        subtotalMateriales,
        subtotal: subtotalTodos,

        extrasPercentInt: extrasPctInt,
        extras: Number(extras.toFixed(2)),
        baseConExtras: Number(baseConExtras.toFixed(2)),

        laborPercentInt: laborPctInt,
        labor: Number(labor.toFixed(2)),

        totalLote: Number(totalLote.toFixed(2)),
        producedQty: producedQty || 0,
        costoUnitario,
      },
      acumulados: {
        totalPesoEnMasaGr: Number(tree.cost.totalPesoEnMasaGr.toFixed(2)),
        totalUnidadesMaterial: Number(tree.cost.totalUnidadesMaterial.toFixed(2)),
      },
      notas: "Extras = % de INSUMOS; Mano de obra = % de (INSUMOS + EXTRAS). Materiales no entran en la base.",
    };

    return res.json({ tree, rows, summary });
  } catch (error) {
    console.error("getRecipeCostingTree error:", error);
    return res.status(500).json({
      message: "Error al calcular costeo en árbol",
      detail: String(error?.message || error),
    });
  }
};





// controllers/RecipeController.js
// Obtener la receta completa de un producto final
export const getRecipe = async (req, res) => {
  try {
    const { productFinalId } = req.params;
    const recipe = await InventoryRecipe.findAll({
      where: { productFinalId },
      include: [
        { model: InventoryProduct, as: 'rawProduct', attributes: ['id', 'name', 'unitId','price'] }
      ]
    });
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener receta', error });
  }
};

// Crear una receta (varios ingredientes a la vez)
export const createRecipe = async (req, res) => {
  try {
    const data = req.body; // arreglo de objetos [{productFinalId, productRawId, quantity}]
    const created = await InventoryRecipe.bulkCreate(data);
    res.status(201).json("created");
  } catch (error) {
    res.status(500).json({ message: 'Error al crear receta', error });
  }
};

// Actualizar un insumo en la receta
export const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await InventoryRecipe.update(req.body, { where: { id } });
    res.json({ message: 'Ingrediente actualizado', updated });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar receta', error });
  }
};

// Eliminar un insumo de la receta
export const deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    await InventoryRecipe.destroy({ where: { id } });
    res.json({ message: 'Ingrediente eliminado de la receta' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar receta', error });
  }
};
