// controllers/catalog/CatalogController.js
import {
  Catalog,
  InventoryProduct,
  InventoryCategory,
  InventoryUnit,
  InventoryMovement,

} from "../../models/Inventory.js";

// controllers/analytics/PopularProductsController.js
import { Op, fn, col } from "sequelize";
import { Order, OrderItem } from "../../models/Orders.js";
/* =========================
   Utils
========================= */
const parseCsv = (v, def = []) =>
  typeof v === "string"
    ? v.split(",").map((s) => s.trim()).filter(Boolean)
    : def;

// Por defecto consideramos pedidos "vendidos" los con estado pagado o entregado
const DEFAULT_OK_STATUSES = ["pagado", "entregado"];

const n = (x, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

/**
 * Agrega ventas por producto desde OrderItems + Orders
 * - soldAll: suma de quantity por productId en TODA la historia
 * - soldWindow: suma de quantity por productId con Order.date >= since
 * - Filtro por estados (Order.status IN okStatuses)
 */
async function aggregateSalesFromOrders({ since, okStatuses }) {
  const orderWhereBase = {};
  if (okStatuses?.length) orderWhereBase.status = { [Op.in]: okStatuses };

  // ALL-TIME
  const allTime = await OrderItem.findAll({
    attributes: [
      "productId",
      [fn("SUM", col("quantity")), "qtySum"],
    ],
    include: [
      {
        model: Order,
        required: true,
        attributes: [],
        where: orderWhereBase, // SIN alias (no se definió 'as' en asociaciones)
      },
    ],
    group: ["productId"],
  });

  // WINDOW (Order.date >= since)
  const windowWhere = { ...orderWhereBase, date: { [Op.gte]: since } };
  const windowRows = await OrderItem.findAll({
    attributes: [
      "productId",
      [fn("SUM", col("quantity")), "qtySum"],
    ],
    include: [
      {
        model: Order,
        required: true,
        attributes: [],
        where: windowWhere,
      },
    ],
    group: ["productId"],
  });

  const soldAllByProduct = new Map();
  allTime.forEach((r) =>
    soldAllByProduct.set(Number(r.productId), n(r.get("qtySum"), 0))
  );

  const soldWindowByProduct = new Map();
  windowRows.forEach((r) =>
    soldWindowByProduct.set(Number(r.productId), n(r.get("qtySum"), 0))
  );

  return { soldAllByProduct, soldWindowByProduct };
}
const formatPriceUSD = (value) => {
  if (value === undefined || value === null) return null;

  const n = Number(value);
  if (Number.isNaN(n)) return null;

  return `$${n.toFixed(2)}`;
};

// GET /inventory/catalog/template-items
export const getCatalogTemplateItems = async (req, res) => {
  try {
    const { onlyActive = "true", onlyValidNow = "true", storeId } = req.query;
    const now = new Date();

    const where = {};
    if (typeof storeId !== "undefined" && storeId !== null && storeId !== "")
      where.storeId = Number(storeId);
    if (String(onlyActive) === "true") where.isActive = true;

    const rows = await Catalog.findAll({
      where,
      include: [
        {
          model: InventoryProduct,
          as: "product",
          required: true,
          attributes: [
            "id",
            "name",
            "desc",
            "price",
            "primaryImageUrl",
            "type",
            "standardWeightGrams",
            "wholesaleRules",
          ],
          include: productIncludeForView,
        },
      ],
      order: [
        ["section", "ASC"],
        ["position", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    const list = String(onlyValidNow) === "true"
      ? rows.filter((r) => isActiveByDates(r, now))
      : rows;

    res.json(list.map(mapCatalogEntryToCard));
  } catch (err) {
    console.error("getCatalogTemplateItems error:", err);
    res.status(500).json({ message: "Error al obtener items para plantillas" });
  }
};


/* =========================
   GET /inventory/analytics/getPopularProducts
   Solo products type='final', desde Orders/OrderItems
========================= */
export const getPopularProducts = async (req, res) => {
  try {
    const {
      days = 30,
      limit = 50,
      activeOnly = "true",
      orderBy = "sold30",        // 'sold30' | 'soldAll'
      orderStatusIn,             // CSV e.g. "pagado,entregado"
    } = req.query;

    const windowDays = Math.max(1, Number(days) || 30);
    const maxItems = Math.max(1, Number(limit) || 50);
    const since = new Date();
    since.setDate(since.getDate() - windowDays);

    const okStatuses = parseCsv(orderStatusIn, DEFAULT_OK_STATUSES);

    // Ventas agregadas desde órdenes
    const { soldAllByProduct, soldWindowByProduct } =
      await aggregateSalesFromOrders({ since, okStatuses });

    // Universo de productos: SOLO 'final' (y activos si corresponde)
    const productWhere = { type: "final" };
    if (String(activeOnly) === "true") productWhere.isActive = true;

    const products = await InventoryProduct.findAll({
      where: productWhere,
      attributes: ["id", "name", "price", "primaryImageUrl", "type", "isActive"],
    });

    // Shape para la UI
    const rows = products.map((p) => {
      const id = Number(p.id);
      return {
        id,
        name: p.name,
        price: n(p.price, 0),
        primaryImageUrl: p.primaryImageUrl || "",
        stats: {
          sold30: soldWindowByProduct.get(id) || 0,
          soldAll: soldAllByProduct.get(id) || 0,
          views30: 0, // placeholders
          rating: 0,
        },
      };
    });

    // Orden y límite
    rows.sort((a, b) => {
      const av = orderBy === "soldAll" ? a.stats.soldAll : a.stats.sold30;
      const bv = orderBy === "soldAll" ? b.stats.soldAll : b.stats.sold30;
      return bv - av;
    });

    res.status(200).json(rows.slice(0, maxItems));
  } catch (err) {
    console.error("getPopularProducts error:", err);
    res.status(500).json({ message: "Error al obtener productos populares" });
  }
};

/* =========================
   GET /inventory/analytics/getAutoCatalogSeed
   Paquete: populares + catálogo existente
========================= */
export const getAutoCatalogSeed = async (req, res) => {
  try {
    const {
      days = 30,
      limit = 50,
      activeOnly = "true",
      orderBy = "sold30",
      orderStatusIn,    // CSV e.g. "pagado,entregado"
      // filtros catálogo existente:
      section,
      onlyActive = "true",
      storeId,          // permitido por compatibilidad; tu Catalog sí tiene storeId
    } = req.query;

    const windowDays = Math.max(1, Number(days) || 30);
    const maxItems = Math.max(1, Number(limit) || 50);
    const since = new Date();
    since.setDate(since.getDate() - windowDays);

    const okStatuses = parseCsv(orderStatusIn, DEFAULT_OK_STATUSES);

    // POPULARES (desde Orders)
    const { soldAllByProduct, soldWindowByProduct } =
      await aggregateSalesFromOrders({ since, okStatuses });

    const productWhere = { type: "final" };
    if (String(activeOnly) === "true") productWhere.isActive = true;

    const products = await InventoryProduct.findAll({
      where: productWhere,
      attributes: ["id", "name", "price", "primaryImageUrl", "type", "isActive"],
    });

    const popular = products.map((p) => {
      const id = Number(p.id);
      return {
        id,
        name: p.name,
        price: n(p.price, 0),
        primaryImageUrl: p.primaryImageUrl || "",
        stats: {
          sold30: soldWindowByProduct.get(id) || 0,
          soldAll: soldAllByProduct.get(id) || 0,
          views30: 0,
          rating: 0,
        },
      };
    });

    popular.sort((a, b) => {
      const av = orderBy === "soldAll" ? a.stats.soldAll : a.stats.sold30;
      const bv = orderBy === "soldAll" ? b.stats.soldAll : b.stats.sold30;
      return bv - av;
    });

    const popularTop = popular.slice(0, maxItems);

    // CATÁLOGO existente -> shape de AutoCatalogLab
    const catWhere = {};
    if (section) catWhere.section = section;
    if (typeof storeId !== "undefined")
      catWhere.storeId = storeId === "" ? null : Number(storeId);
    if (String(onlyActive) === "true") catWhere.isActive = true;

    const existingCatalog = await Catalog.findAll({
      where: catWhere,
      attributes: [
        "id",
        "productId",
        "section",
        "title",
        "subtitle",
        "badge",
        "position",
        "isActive",
        "priceOverride",
        "imageUrl",
        "minOrderQty",
      ],
      order: [
        ["section", "ASC"],
        ["position", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    const catalogShape = existingCatalog.map((r) => ({
      id: r.id,
      productId: r.productId,
      section: r.section,
      title: r.title,
      subtitle: r.subtitle,
      badge: r.badge,
      position: r.position,
      isActive: !!r.isActive,
      priceOverride: r.priceOverride == null ? null : n(r.priceOverride, null),
      imageUrl: r.imageUrl || "",
      minOrderQty: r.minOrderQty,

    }));

    res.status(200).json({
      products: popularTop,
      catalog: catalogShape,
    });
  } catch (err) {
    console.error("getAutoCatalogSeed error:", err);
    res.status(500).json({ message: "Error al obtener datos para AutoCatalogLab" });
  }
};


/* =========================
   Helpers
========================= */

const slugify = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const isActiveByDates = (row, now = new Date()) => {
  const { startsAt, endsAt } = row || {};
  if (startsAt && now < new Date(startsAt)) return false;
  if (endsAt && now > new Date(endsAt)) return false;
  return true;
};

/**
 * Normaliza reglas de mayoreo que pueden venir como:
 * - null/undefined -> []
 * - string JSON -> parse
 * - array -> tal cual
 * - objeto con tiers -> tiers
 * - cualquier otra cosa -> []
 */
function normalizeWholesaleRules(val) {
  if (val == null) return [];
if (typeof val === "string") {
  try {
    // Primer parse: elimina el primer nivel de string escapado
    val = JSON.parse(val);
    // Si aún sigue siendo string, parsea de nuevo (doble escapado)
    if (typeof val === "string") {
      try { val = JSON.parse(val); } catch {}
    }
  } catch {
    return [];
  }
}

  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.tiers)) return val.tiers;
  return [];
}


/** Convierte texto JSON en objeto, o null si está vacío */
function parseJsonMaybe(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return v; } // si no parsea, guarda tal cual
  }
  return v;
}

/* =========================
   Mapeo al formato del frontend (vitrina)
========================= */
const mapCatalogEntryToCard = (row) => {
  const product = row.product || {};

  const basePrice =
    row.displayPrice ??
    product.price ??
    null;

  return {
    id: row.id,
    badge: row.badge,
    displayName: product.name,
    section: row.section,
    displayPrice: formatPriceUSD(basePrice),

    imageUrl: product.primaryImageUrl,
    product: {
      id: product.id,
      name: product.name,
      primaryImageUrl: product.primaryImageUrl,
    },
  };
};



/* Include para endpoints de VITRINA: forzamos attributes (incluye wholesaleRules) */
const productIncludeForView = [
  {
    model: InventoryUnit,
    as: "ERP_inventory_unit",
    attributes: ["abbreviation"],
  },
  {
    model: InventoryCategory,
    as: "ERP_inventory_category",
    attributes: ["name"],
  },
];

/* =========================
   GET /api/catalog/section/:section
   (VITRINA) - Si no hay override de catálogo, usa reglas del producto.
========================= */
export const getCatalogBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const { storeId = null, onlyActive = "true" } = req.query;
    const now = new Date();

    const where = { section };
    if (storeId) where.storeId = Number(storeId);
    if (String(onlyActive) === "true") where.isActive = true;

    const rows = await Catalog.findAll({
      where,
      include: [
        {
          model: InventoryProduct,
          as: "product",
          required: true,
          attributes: [
            "id",
            "name",
            "desc",
            "price",
            "primaryImageUrl",
            "type",
            "categoryId",
            "unitId",
            "standardWeightGrams",
            "wholesaleRules", // 👈 reglas mayoristas del producto
          ],
          include: productIncludeForView,
        },
      ],
      order: [
        ["position", "ASC"],
        ["createdAt", "DESC"],
      ],
      // 👇 Ojo: no ponemos attributes a nivel Catalog,
      // así que vienen TODOS los campos, incluido minOrderQty
    });

    const valid = rows.filter((r) => isActiveByDates(r, now));

    // 👇 Aquí es donde hay que asegurarse de que mapCatalogEntryToCard
    // exponga r.minOrderQty en el JSON
    const data = valid.map(mapCatalogEntryToCard);

    res.json(data);
  } catch (err) {
    console.error("getCatalogBySection error:", err);
    res.status(500).json({ message: "Error al obtener catálogo por sección" });
  }
};


/* =========================
   GET /api/catalog/sections?sections=home,ofertas
   (VITRINA) - Si no hay override de catálogo, usa reglas del producto.
========================= */
export const getCatalogBySections = async (req, res) => {
  try {
    const { sections = "", storeId = null, onlyActive = "true" } = req.query;
    const list = sections
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!list.length) {
      return res.status(400).json({ message: "Parámetro 'sections' requerido" });
    }

    const now = new Date();
    const where = { section: { [Op.in]: list } };
    if (storeId) where.storeId = Number(storeId);
    if (String(onlyActive) === "true") where.isActive = true;

    const rows = await Catalog.findAll({
      where,
      include: [
        {
          model: InventoryProduct,
          as: "product",
          required: true,
          attributes: [
            "id",
            "name",
            "price",
            "desc",
            "primaryImageUrl",
            "type",
            "categoryId",
            "unitId",
            "standardWeightGrams",
            "wholesaleRules",
          ],
          include: productIncludeForView,
        },
      ],
      order: [
        ["section", "ASC"],
        ["position", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    const grouped = {};
    list.forEach((s) => (grouped[s] = []));
    rows.forEach((r) => {
      if (!isActiveByDates(r, now)) return;
      const entry = mapCatalogEntryToCard(r); // 👈 aquí también
      (grouped[r.section] ||= []).push(entry);
    });

    res.json(grouped);
  } catch (err) {
    console.error("getCatalogBySections error:", err);
    res.status(500).json({ message: "Error al obtener múltiples secciones de catálogo" });
  }
};

/* =========================
   Admin CRUD
========================= */

function buildCatalogWhere(query) {
  const { section, isActive, storeId, q, onlyValidNow } = query || {};
  const where = {};
  if (section) where.section = section;
  if (typeof isActive !== "undefined") where.isActive = String(isActive) === "true";
  if (typeof storeId !== "undefined" && storeId !== null && storeId !== "")
    where.storeId = Number(storeId);

  if (String(onlyValidNow) === "true") {
    const now = new Date();
    where[Op.and] = [
      { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
      { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] },
    ];
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    where[Op.or] = [
      { title: { [Op.iLike]: term } },
      { subtitle: { [Op.iLike]: term } },
      { badge: { [Op.iLike]: term } },
    ];
  }

  return where;
}

/* =========================
   GET /inventory/catalog (ADMIN)
========================= */
export const getCatalogEntries = async (req, res) => {
  try {
    const { limit = 50, offset = 0, orderBy = "position", orderDir = "ASC", q } =
      req.query;

    const where = buildCatalogWhere(req.query);
    const productWhere = q && q.trim()
      ? { name: { [Op.iLike]: `%${q.trim()}%` } }
      : undefined;

    const rows = await Catalog.findAll({
      where,
      include: [
        {
          model: InventoryProduct,
          as: "product",
          required: false,
          where: productWhere,
          attributes: [
            "id",
            "name",
            "desc",
            "price",
            "primaryImageUrl",
            "type",
            "categoryId",
            "unitId",
            "wholesaleRules", // 👈 necesario para que el admin vea reglas del producto
          ],
          include: [
            { model: InventoryUnit, attributes: ["id", "name", "abbreviation"] },
            { model: InventoryCategory, attributes: ["id", "name"] },
          ],
        },
      ],
      limit: Number(limit),
      offset: Number(offset),
      order: [[orderBy, orderDir], ["createdAt", "DESC"]],
    });

    res.status(200).json(rows);
  } catch (error) {
    console.error("getCatalogEntries error:", error);
    res.status(500).json({ message: "Error al obtener catálogo" });
  }
};


export const createCatalogEntry = async (req, res) => {
  try {
    const {
      productId,
      section = "home",
      title = null,
      subtitle = null,
      badge = null,
      imageUrl = null,
      position = 0,
      isActive = true,
      minOrderQty = null,         // 👈 NUEVO
      priceOverride = null,
      wholesaleOverrideRules = null,
      storeId = null,
      startsAt = null,
      endsAt = null,
    } = req.body;

    if (!productId)
      return res.status(400).json({ message: "productId es obligatorio" });

    const product = await InventoryProduct.findByPk(productId);
    if (!product) return res.status(404).json({ message: "Producto no existe" });

    // Validar que no exista duplicado por (productId, section, storeId)
    const exists = await Catalog.findOne({
      where: { productId, section, storeId: storeId ?? null },
    });
    if (exists)
      return res.status(409).json({
        message: "Ya existe una entrada para este producto en esa sección (y tienda).",
      });

    // --- Normalizar / validar minOrderQty ---
    let normalizedMinOrderQty = null;
    if (minOrderQty !== undefined && minOrderQty !== null && minOrderQty !== "") {
      const parsed = Number(minOrderQty);
      if (!Number.isFinite(parsed) || parsed < 1) {
        return res.status(400).json({
          message: "minOrderQty debe ser un número entero mayor o igual a 1",
        });
      }
      normalizedMinOrderQty = Math.trunc(parsed);
    }

    const row = await Catalog.create({
      productId,
      section,
      title,
      subtitle,
      badge,
      imageUrl,
      position: Number(position) || 0,
      isActive: String(isActive) === "true" || isActive === true,
      minOrderQty: normalizedMinOrderQty, // 👈 se guarda aquí
      priceOverride: priceOverride === "" ? null : priceOverride,
      wholesaleOverrideRules: parseJsonMaybe(wholesaleOverrideRules),
      storeId: storeId ?? null,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    });

    res.status(201).json({ message: "Creado", catalog: row });
  } catch (error) {
    console.error("createCatalogEntry error:", error);
    res.status(500).json({ message: "Error al crear entrada de catálogo" });
  }
};


export const updateCatalogEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await Catalog.findByPk(id);
    if (!row) return res.status(404).json({ message: "Entrada no encontrada" });

    const {
      productId,
      section,
      title,
      subtitle,
      badge,
      imageUrl,
      position,
      isActive,
      minOrderQty,                // 👈 NUEVO
      priceOverride,
      wholesaleOverrideRules,
      storeId,
      startsAt,
      endsAt,
    } = req.body;

    const updates = {};

    if (typeof productId !== "undefined") {
      const product = await InventoryProduct.findByPk(productId);
      if (!product)
        return res.status(404).json({ message: "Producto no existe" });
      updates.productId = productId;
    }

    if (typeof section   !== "undefined") updates.section   = section;
    if (typeof title     !== "undefined") updates.title     = title;
    if (typeof subtitle  !== "undefined") updates.subtitle  = subtitle;
    if (typeof badge     !== "undefined") updates.badge     = badge;
    if (typeof imageUrl  !== "undefined") updates.imageUrl  = imageUrl || null;
    if (typeof position  !== "undefined") updates.position  = Number(position) || 0;
    if (typeof isActive  !== "undefined")
      updates.isActive = String(isActive) === "true" || isActive === true;

    // --- Normalizar / validar minOrderQty en update ---
    if (typeof minOrderQty !== "undefined") {
      if (minOrderQty === null || minOrderQty === "") {
        // limpiar restricción
        updates.minOrderQty = null;
      } else {
        const parsed = Number(minOrderQty);
        if (!Number.isFinite(parsed) || parsed < 1) {
          return res.status(400).json({
            message: "minOrderQty debe ser un número entero mayor o igual a 1",
          });
        }
        updates.minOrderQty = Math.trunc(parsed);
      }
    }

    if (typeof priceOverride !== "undefined")
      updates.priceOverride = priceOverride === "" ? null : priceOverride;

    if (typeof wholesaleOverrideRules !== "undefined")
      updates.wholesaleOverrideRules = parseJsonMaybe(wholesaleOverrideRules);

    if (typeof storeId   !== "undefined") updates.storeId   = storeId ?? null;
    if (typeof startsAt  !== "undefined")
      updates.startsAt = startsAt ? new Date(startsAt) : null;
    if (typeof endsAt    !== "undefined")
      updates.endsAt = endsAt ? new Date(endsAt) : null;

    // Validar restricción única si cambia productId/section/storeId
    const checkProductId =
      typeof updates.productId !== "undefined" ? updates.productId : row.productId;
    const checkSection =
      typeof updates.section   !== "undefined" ? updates.section   : row.section;
    const checkStoreId =
      typeof updates.storeId   !== "undefined" ? updates.storeId   : row.storeId;

    const exists = await Catalog.findOne({
      where: {
        productId: checkProductId,
        section: checkSection,
        storeId: checkStoreId ?? null,
        id: { [Op.ne]: row.id },
      },
    });
    if (exists) {
      return res.status(409).json({
        message: "Ya existe una entrada para este producto en esa sección (y tienda).",
      });
    }

    await row.update(updates);
    res.status(200).json({ message: "Actualizado", catalog: row });
  } catch (error) {
    console.error("updateCatalogEntry error:", error);
    res.status(500).json({ message: "Error al actualizar entrada de catálogo" });
  }
};

/* =========================
   DELETE /inventory/catalog/:id (ADMIN)
========================= */
export const deleteCatalogEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await Catalog.findByPk(id);
    if (!row) return res.status(404).json({ message: "Entrada no encontrada" });

    await row.destroy();
    res.status(200).json({ message: "Eliminado" });
  } catch (error) {
    console.error("deleteCatalogEntry error:", error);
    res.status(500).json({ message: "Error al eliminar entrada de catálogo" });
  }
};

/* =========================
   POST /inventory/catalog/reorder (ADMIN)
========================= */
export const reorderCatalogEntries = async (req, res) => {
  try {
    const { section, items } = req.body || {};
    if (!section || !Array.isArray(items))
      return res.status(400).json({ message: "section e items son requeridos" });

    const updates = items.map(({ id, position }) =>
      Catalog.update({ position: Number(position) || 0 }, { where: { id, section } })
    );
    await Promise.all(updates);
    res.status(200).json({ message: "Reordenado" });
  } catch (error) {
    console.error("reorderCatalogEntries error:", error);
    res.status(500).json({ message: "Error al reordenar catálogo" });
  }
};
