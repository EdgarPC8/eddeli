// controllers/stores/StoreProductsController.js

// controllers/stores/StoreProductsController.js
import {
  InventoryProduct,
  InventoryCategory,
  InventoryUnit,
  StoreProduct,
  Store, // 👈 te faltaba
} from "../../models/Inventory.js";
import { notifyOk, notifyFail } from "../../services/notifyRaptorSolutions.js";

// GET /stores/:storeId/products
// Controllers/InventoryControl/StoreProductsController.js
import { Op, where, fn, col } from 'sequelize';


export const getProductsByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { activeOnly = 'true', q = '' } = req.query;

    // Filtro pivote
    const whereSP = { storeId: Number(storeId) };
    if (String(activeOnly) === 'true') whereSP.isActive = true;

    // Filtro producto
    const whereProduct = { type: 'final', isActive: true };
    const search = String(q || '').trim();
    if (search) {
      // Case-insensitive portable (MySQL/PG)
      // Usa el alias REAL generado por Sequelize: ERP_inventory_product
      whereProduct[Op.and] = [
        where(fn('lower', col('ERP_inventory_product.name')), {
          [Op.like]: `%${search.toLowerCase()}%`,
        }),
      ];
    }

    const rows = await StoreProduct.findAll({
      where: whereSP,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: InventoryProduct,         // SIN alias
          where: whereProduct,
          required: true,
          include: [
            { model: InventoryCategory, required: false }, // LEFT JOIN
            { model: InventoryUnit,     required: false }, // LEFT JOIN
          ],
        },
      ],
      raw: false,
      nest: true,
    });

    // IMPORTANTE: acceder con los alias por defecto (singularizados)
    const data = rows.map((sp) => {
      const p = sp.ERP_inventory_product; // <- así lo entrega Sequelize con tus define()
      return {
        linkId: sp.id,
        storeId: sp.storeId,
        productId: p.id,
        isActive: !!sp.isActive,
        product: {
          id: p.id,
          name: p.name,
          price: Number(p.price || 0),
          primaryImageUrl: p.primaryImageUrl || null,
          type: p.type,
          isActive: !!p.isActive,

          categoryId: p.ERP_inventory_category?.id ?? null,
          category:   p.ERP_inventory_category?.name ?? null,

          unitId:     p.ERP_inventory_unit?.id ?? null,
          unit:       p.ERP_inventory_unit?.abbreviation ?? p.ERP_inventory_unit?.name ?? null,
        },
        createdAt: sp.createdAt,
        updatedAt: sp.updatedAt,
      };
    });

    return res.json(data);
  } catch (err) {
    console.error('getProductsByStore error:', err);
    return res.status(500).json({ message: 'Error al obtener productos de la tienda' });
  }
};



export const addProductsToStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { productIds = [] } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      notifyFail("store.product_assign_failed", "productIds es requerido", { req, httpStatus: 400 });
      return res.status(400).json({ message: "productIds es requerido (array)" });
    }

    const ops = productIds.map(async (pid) => {
      const [row] = await StoreProduct.findOrCreate({
        where: { storeId: Number(storeId), productId: Number(pid) },
        defaults: { isActive: true },
      });
      // Si ya existía, asegúralo activo (opcional)
      if (!row.isActive) await row.update({ isActive: true });
      return row;
    });

    const created = await Promise.all(ops);
    notifyOk("store.product_assigned", `Productos asignados al local #${storeId}`, {
      storeId,
      count: created.length,
    });
    res.status(201).json({ message: "Asignaciones creadas/activadas", rows: created });
  } catch (err) {
    console.error("addProductsToStore error:", err);
    notifyFail("store.product_assign_failed", "Error al asignar productos a la tienda", {
      error: err,
      req,
      httpStatus: 500,
    });
    res.status(500).json({ message: "Error al asignar productos a la tienda" });
  }
};
export const removeProductFromStore = async (req, res) => {
  try {
    const { storeId, productId } = req.params;
    const row = await StoreProduct.findOne({
      where: { storeId: Number(storeId), productId: Number(productId) },
    });
    if (!row) {
      notifyFail("store.product_remove_failed", "Relación store-producto no encontrada", {
        req,
        httpStatus: 404,
      });
      return res.status(404).json({ message: "Relación no encontrada" });
    }

    await row.destroy();
    notifyOk("store.product_removed", `Producto #${productId} quitado del local #${storeId}`, {
      storeId,
      productId,
    });
    res.json({ message: "Desasignado" });
  } catch (err) {
    console.error("removeProductFromStore error:", err);
    notifyFail("store.product_remove_failed", "Error al desasignar producto", {
      error: err,
      req,
      httpStatus: 500,
    });
    res.status(500).json({ message: "Error al desasignar producto" });
  }
};
export const toggleStoreProduct = async (req, res) => {
  try {
    const { storeId, productId } = req.params;
    const { isActive } = req.body;

    const row = await StoreProduct.findOne({
      where: { storeId: Number(storeId), productId: Number(productId) },
    });
    if (!row) {
      notifyFail("store.product_toggle_failed", "Relación store-producto no encontrada", {
        req,
        httpStatus: 404,
      });
      return res.status(404).json({ message: "Relación no encontrada" });
    }

    await row.update({ isActive: Boolean(isActive) });
    notifyOk("store.product_toggled", `Toggle producto #${productId} en local #${storeId}`, {
      storeId,
      productId,
      isActive: Boolean(isActive),
    });
    res.json({ message: "Actualizado", row });
  } catch (err) {
    console.error("toggleStoreProduct error:", err);
    notifyFail("store.product_toggle_failed", "Error al actualizar relación", {
      error: err,
      req,
      httpStatus: 500,
    });
    res.status(500).json({ message: "Error al actualizar relación" });
  }
};

export const getStoresByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const links = await StoreProduct.findAll({
      where: { productId: Number(productId), isActive: true },
      include: [{ model: Store, required: true }],
      order: [[Store, "position", "ASC"]],
    });

    const data = links.map((l) => ({
      storeId: l.storeId,
      name: l.Store?.name,
      address: l.Store?.address,
      city: l.Store?.city,
      province: l.Store?.province,
      imageUrl: l.Store?.imageUrl || null,
      isActive: !!l.Store?.isActive,
    }));

    res.json(data);
  } catch (err) {
    console.error("getStoresByProduct error:", err);
    res.status(500).json({ message: "Error al obtener tiendas del producto" });
  }
};

