import { InventoryCategory } from "../../models/Inventory.js";
import { normalizePackageTiersStrict } from "../../utils/productPricingUtils.js";

const CATEGORY_INCLUDE_PARENT = {
  model: InventoryCategory,
  as: "parent",
  attributes: ["id", "name"],
  required: false,
};

function normalizeMixMatchProductIds(raw) {
  if (raw == null || raw === "") return null;
  let val = raw;
  if (typeof val === "string") {
    try {
      val = JSON.parse(val);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(val)) return null;
  const ids = [...new Set(val.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))];
  return ids.length ? ids : null;
}

async function validateParentId(parentId, categoryId = null) {
  if (parentId == null || parentId === "") return null;
  const pid = Number(parentId);
  if (!Number.isFinite(pid) || pid <= 0) {
    throw new Error("La categoría padre no es válida.");
  }
  if (categoryId && pid === Number(categoryId)) {
    throw new Error("Una categoría no puede ser padre de sí misma.");
  }
  const parent = await InventoryCategory.findByPk(pid);
  if (!parent) {
    throw new Error("Categoría padre no encontrada.");
  }
  if (parent.parentId) {
    throw new Error("Solo hay dos niveles: categoría principal y subcategoría.");
  }
  return pid;
}

async function applyCategoryPayload(body, categoryId = null) {
  const payload = { ...body };
  if ("packageTiers" in payload) {
    payload.packageTiers = normalizePackageTiersStrict(payload.packageTiers);
  }
  if ("mixMatchProductIds" in payload) {
    payload.mixMatchProductIds = normalizeMixMatchProductIds(payload.mixMatchProductIds);
  }
  if ("mixMatchLabel" in payload) {
    const label = String(payload.mixMatchLabel ?? "").trim();
    payload.mixMatchLabel = label || null;
  }
  if ("parentId" in payload) {
    payload.parentId = await validateParentId(payload.parentId, categoryId);
  }
  return payload;
}

// Crear categoría
export const createCategory = async (req, res) => {
  try {
    const payload = await applyCategoryPayload(req.body);
    const category = await InventoryCategory.create(payload);
    const full = await InventoryCategory.findByPk(category.id, {
      include: [CATEGORY_INCLUDE_PARENT],
    });
    res.status(201).json(full);
  } catch (err) {
    if (err?.message && (/packageTiers|categoría|padre|niveles/i.test(err.message))) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Error al crear categoría", error: err });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const onlyPublic = req.query.public === "true";
    const where = {};
    if (onlyPublic) {
      where.isPublic = true;
    }

    const categories = await InventoryCategory.findAll({
      where,
      include: [CATEGORY_INCLUDE_PARENT],
      order: [
        ["parentId", "ASC"],
        ["name", "ASC"],
      ],
    });
    res.json(categories);
  } catch (err) {
    console.error("Error al obtener categorías:", err);
    res.status(500).json({ message: "Error al obtener categorías", error: err });
  }
};

// Editar categoría
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = await applyCategoryPayload(req.body, id);

    if ("parentId" in updates && updates.parentId) {
      const children = await InventoryCategory.count({ where: { parentId: id } });
      if (children > 0) {
        return res.status(400).json({
          message: "No puedes convertir en subcategoría una categoría que ya tiene hijas.",
        });
      }
    }

    await InventoryCategory.update(updates, { where: { id } });
    const full = await InventoryCategory.findByPk(id, {
      include: [CATEGORY_INCLUDE_PARENT],
    });
    res.json(full);
  } catch (err) {
    if (err?.message && (/packageTiers|categoría|padre|niveles/i.test(err.message))) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Error al actualizar categoría", error: err });
  }
};

// Eliminar categoría
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const children = await InventoryCategory.count({ where: { parentId: id } });
    if (children > 0) {
      return res.status(400).json({
        message: "Elimina o reasigna las subcategorías antes de borrar esta categoría.",
      });
    }
    await InventoryCategory.destroy({ where: { id } });
    res.json({ message: "Categoría eliminada" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar categoría", error: err });
  }
};
