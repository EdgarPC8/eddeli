// controllers/ProductController.js
import { Op } from "sequelize";
import fs from "fs";
import { join } from "path";
const { __dirname } = fileDirName(import.meta);

import {
  InventoryProduct,
  InventoryCategory,
  InventoryUnit,
  // Si también usas HomeProduct o ProductPlacement y guardan archivos, puedes chequearlos acá
  // HomeProduct,
  // ProductPlacement,
} from "../../models/Inventory.js";
import fileDirName from "../../libs/file-dirname.js";

// === Config carpeta imágenes ===
const EDDELI_DIR = join(__dirname, "../img/EdDeli");
const imagePath = (filename) => join(EDDELI_DIR, filename);

const safeUnlink = (fullPath) => {
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (e) {
    console.warn("No se pudo borrar archivo:", fullPath, e?.message);
  }
};

// ¿La imagen está en uso por otros registros?
const isImageInUseElsewhere = async (filename, currentProductId = null) => {
  if (!filename) return false;

  const countProducts = await InventoryProduct.count({
    where: currentProductId
      ? { primaryImageUrl: filename, id: { [Op.ne]: currentProductId } }
      : { primaryImageUrl: filename },
  });

  // Si también la usan otras tablas, suma aquí:
  // const countHome = await HomeProduct.count({ where: { imageUrl: filename } });
  // const countPlacement = await ProductPlacement.count({ where: { imageUrl: filename } });

  return countProducts > 0; // || countHome > 0 || countPlacement > 0;
};

// ================== CRUD con imagen ==================

// Crear producto (con upload.single("image"))
export const createProduct = async (req, res) => {
  let tempFilename = null;
  try {
    const payload = { ...req.body };

    // --- normalizaciones numéricas ---
    [
      "unitId", "categoryId",
      "standardWeightGrams", "netWeight",
      "stock", "minStock",
      "price", "distributorPrice", "taxRate",
    ].forEach((k) => {
      if (k in payload && payload[k] !== null && payload[k] !== "") {
        payload[k] = Number(payload[k]);
      }
    });

    // --- booleanos ---
    if ("isActive" in payload) payload.isActive = String(payload.isActive) === "true";

    // --- archivo de imagen ---
    if (req.file?.filename) {
      tempFilename = req.file.filename;
      payload.primaryImageUrl = req.file.filename;
    }

    // ---------- WHOLESALE RULES (estricto JSON) ----------
    // helper: normaliza a array de tiers o null; si invalido, lanza Error
    const normalizeWholesaleRulesStrict = (input) => {
      if (input == null || input === "") return null;

      // Si viene por multipart/textarea será string -> parse UNA sola vez
      let val = input;
      if (typeof val === "string") {
        try { val = JSON.parse(val); }
        catch { throw new Error("wholesaleRules debe ser JSON válido (string no parseó)."); }
      }

      // Acepta array directo o objeto { tiers: [...] }
      let tiers = Array.isArray(val) ? val : (val && Array.isArray(val.tiers)) ? val.tiers : null;
      if (!tiers) throw new Error("wholesaleRules debe ser un array o un objeto { tiers: [...] }.");

      // Normaliza shape y números
      tiers = tiers.map((t) => {
        if (!t || typeof t !== "object") return null;
        const out = {};
        if (t.minQty != null && Number.isFinite(Number(t.minQty))) out.minQty = Number(t.minQty);
        if (t.discountPercent != null && Number.isFinite(Number(t.discountPercent))) out.discountPercent = Number(t.discountPercent);
        if (t.pricePerUnit != null && Number.isFinite(Number(t.pricePerUnit))) out.pricePerUnit = Number(t.pricePerUnit);
        return Object.keys(out).length ? out : null;
      }).filter(Boolean);

      if (!tiers.length) return null;
      return tiers;
    };

    if ("wholesaleRules" in payload) {
      payload.wholesaleRules = normalizeWholesaleRulesStrict(payload.wholesaleRules);
    } else if ("wholesaleRulesText" in payload) {
      // si el form manda un campo texto
      payload.wholesaleRules = normalizeWholesaleRulesStrict(payload.wholesaleRulesText);
      delete payload.wholesaleRulesText;
    }

    // --- crear producto ---
    const product = await InventoryProduct.create(payload);
    return res.status(201).json(product);
  } catch (error) {
    if (tempFilename) safeUnlink(imagePath(tempFilename));
    // Si el error viene de validación de wholesale, devolvemos 400
    if (error?.message && /wholesaleRules/.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Error al crear producto", error });
  }
};



// Obtener todos los productos con categoría y unidad
export const getAllProducts = async (req, res) => {
  try {
    const products = await InventoryProduct.findAll({
      include: [
        { model: InventoryCategory, attributes: ["id", "name"] },
        { model: InventoryUnit, attributes: ["id", "name", "abbreviation"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener productos", error });
  }
};

// Obtener un producto por id
export const getProductById = async (req, res) => {
  try {
    const row = await InventoryProduct.findByPk(req.params.id, {
      include: [
        { model: InventoryCategory, attributes: ["id", "name"] },
        { model: InventoryUnit, attributes: ["id", "name", "abbreviation"] },
      ],
    });
    if (!row) return res.status(404).json({ message: "Producto no encontrado" });
    res.json(row);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener producto", error });
  }
};

// Editar producto (con upload.single("image"))
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await InventoryProduct.findByPk(id);
    if (!row) return res.status(404).json({ message: "Producto no encontrado" });

    const updates = { ...req.body };

    // --- normalizaciones numéricas ---
    [
      "unitId", "categoryId",
      "standardWeightGrams", "netWeight",
      "stock", "minStock",
      "price", "distributorPrice", "taxRate",
    ].forEach((k) => {
      if (k in updates && updates[k] !== null && updates[k] !== "") {
        updates[k] = Number(updates[k]);
      }
    });

    // --- booleanos ---
    if ("isActive" in updates) updates.isActive = String(updates.isActive) === "true";

    // --- limpiar imagen si clearImage=true ---
    if (String(updates.clearImage) === "true" && row.primaryImageUrl) {
      const used = await isImageInUseElsewhere(row.primaryImageUrl, row.id);
      if (!used) safeUnlink(imagePath(row.primaryImageUrl));
      updates.primaryImageUrl = null;
    }
    delete updates.clearImage;

    // --- nueva imagen subida ---
    if (req.file?.filename) {
      if (row.primaryImageUrl) {
        const used = await isImageInUseElsewhere(row.primaryImageUrl, row.id);
        if (!used) safeUnlink(imagePath(row.primaryImageUrl));
      }
      updates.primaryImageUrl = req.file.filename;
    } else if (typeof req.body.primaryImageUrl !== "undefined") {
      updates.primaryImageUrl = req.body.primaryImageUrl || null;
    }

    // ---------- WHOLESALE RULES (estricto JSON) ----------
    const normalizeWholesaleRulesStrict = (input) => {
      if (input == null || input === "") return null;

      let val = input;
      if (typeof val === "string") {
        try { val = JSON.parse(val); }
        catch { throw new Error("wholesaleRules debe ser JSON válido (string no parseó)."); }
      }

      let tiers = Array.isArray(val) ? val : (val && Array.isArray(val.tiers)) ? val.tiers : null;
      if (!tiers) throw new Error("wholesaleRules debe ser un array o un objeto { tiers: [...] }.");

      tiers = tiers.map((t) => {
        if (!t || typeof t !== "object") return null;
        const out = {};
        if (t.minQty != null && Number.isFinite(Number(t.minQty))) out.minQty = Number(t.minQty);
        if (t.discountPercent != null && Number.isFinite(Number(t.discountPercent))) out.discountPercent = Number(t.discountPercent);
        if (t.pricePerUnit != null && Number.isFinite(Number(t.pricePerUnit))) out.pricePerUnit = Number(t.pricePerUnit);
        return Object.keys(out).length ? out : null;
      }).filter(Boolean);

      if (!tiers.length) return null;
      return tiers;
    };

    if ("wholesaleRules" in updates) {
      updates.wholesaleRules = normalizeWholesaleRulesStrict(updates.wholesaleRules);
    } else if ("wholesaleRulesText" in updates) {
      updates.wholesaleRules = normalizeWholesaleRulesStrict(updates.wholesaleRulesText);
      delete updates.wholesaleRulesText;
    }

    // --- actualizar producto ---
    await row.update(updates);
    res.json({ message: "Producto actualizado", product: row });
  } catch (error) {
    if (error?.message && /wholesaleRules/.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error al actualizar producto", error });
  }
};



// Eliminar producto (borra imagen si no está en uso por otros)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await InventoryProduct.findByPk(id);
    if (!row) return res.status(404).json({ message: "Producto no encontrado" });

    if (row.primaryImageUrl) {
      const used = await isImageInUseElsewhere(row.primaryImageUrl, row.id);
      if (!used) safeUnlink(imagePath(row.primaryImageUrl));
    }

    await row.destroy();
    res.json({ message: "Producto eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar producto", error });
  }
};
