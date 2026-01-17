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


// controllers/ProductController.js (solo createProduct)
// ✅ Copia y pega tal cual




// === Config carpeta imágenes ===
// ⚠️ Este controller está en src/controllers/... => para llegar a src/img es ../../img
const IMG_BASE_DIR = join(__dirname, "../../img");
const imagePath = (relPath) => join(IMG_BASE_DIR, relPath);

const safeUnlink = (fullPath) => {
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (e) {
    console.warn("No se pudo borrar archivo:", fullPath, e?.message);
  }
};

export const createProduct = async (req, res) => {
  let tempRelPath = null; // ✅ para rollback si falla
  try {
    const payload = { ...req.body };

    // --- normalizaciones numéricas ---
    [
      "unitId",
      "categoryId",
      "standardWeightGrams",
      "netWeight",
      "stock",
      "minStock",
      "price",
      "distributorPrice",
      "taxRate",
    ].forEach((k) => {
      if (k in payload && payload[k] !== null && payload[k] !== "") {
        payload[k] = Number(payload[k]);
      }
    });

    // --- booleanos ---
    if ("isActive" in payload) {
      payload.isActive = String(payload.isActive) === "true";
    }

    // ✅ IMAGEN: guardar la ruta relativa EXACTA que calculó el middleware
    // - "" => "archivo.png"
    // - "EdDeli/products" => "EdDeli/products/archivo.png"
    if (req.file?.filename) {
      tempRelPath = req.uploadInfo?.relPath || req.file.filename;
      payload.primaryImageUrl = tempRelPath;
    }

    // ---------- WHOLESALE RULES (estricto JSON) ----------
    const normalizeWholesaleRulesStrict = (input) => {
      if (input == null || input === "") return null;

      let val = input;
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {
          throw new Error("wholesaleRules debe ser JSON válido (string no parseó).");
        }
      }

      let tiers = Array.isArray(val)
        ? val
        : val && Array.isArray(val.tiers)
        ? val.tiers
        : null;

      if (!tiers) throw new Error("wholesaleRules debe ser un array o un objeto { tiers: [...] }.");

      tiers = tiers
        .map((t) => {
          if (!t || typeof t !== "object") return null;
          const out = {};
          if (t.minQty != null && Number.isFinite(Number(t.minQty))) out.minQty = Number(t.minQty);
          if (t.discountPercent != null && Number.isFinite(Number(t.discountPercent)))
            out.discountPercent = Number(t.discountPercent);
          if (t.pricePerUnit != null && Number.isFinite(Number(t.pricePerUnit)))
            out.pricePerUnit = Number(t.pricePerUnit);
          return Object.keys(out).length ? out : null;
        })
        .filter(Boolean);

      if (!tiers.length) return null;
      return tiers;
    };

    if ("wholesaleRules" in payload) {
      payload.wholesaleRules = normalizeWholesaleRulesStrict(payload.wholesaleRules);
    } else if ("wholesaleRulesText" in payload) {
      payload.wholesaleRules = normalizeWholesaleRulesStrict(payload.wholesaleRulesText);
      delete payload.wholesaleRulesText;
    }

    // ✅ NO guardar subfolder en la tabla (si te llega por form)
    delete payload.subfolder;

    // --- crear producto ---
    const product = await InventoryProduct.create(payload);
    return res.status(201).json(product);
  } catch (error) {
    // ✅ rollback: si subió imagen y falló el create, borra el archivo subido
    if (tempRelPath) safeUnlink(imagePath(tempRelPath));

    if (error?.message && /wholesaleRules/.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Error al crear producto", error });
  }
};


export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await InventoryProduct.findByPk(id);
    if (!row) return res.status(404).json({ message: "Producto no encontrado" });

    const oldRelPath = row.primaryImageUrl; // ej: "EdDeli/products/old.jpg"
    const updates = { ...req.body };

    // ... (tus normalizaciones)

    let newRelPath = null;

    // ✅ si hay nueva imagen: construye relPath con subfolder
    if (req.file?.filename) {
      newRelPath = req.uploadInfo?.relPath || req.file.filename;
      updates.primaryImageUrl = newRelPath;
    } else {
      delete updates.primaryImageUrl;
    }
    

    await row.update(updates);

    // ✅ borra la imagen anterior si se reemplazó por otra
    if (newRelPath && oldRelPath && oldRelPath !== newRelPath) {
      const used = await isImageInUseElsewhere(oldRelPath, row.id);
      if (!used) safeUnlink(imagePath(oldRelPath));
    }

    return res.json({ message: "Producto actualizado", product: row });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar producto", error });
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





// Obtener todos los productos con categoría y unidad
export const getAllProducts = async (req, res) => {
  try {
    const products = await InventoryProduct.findAll({
      include: [
        { model: InventoryCategory, attributes: ["id", "name"] },
        { model: InventoryUnit, attributes: ["id", "name", "abbreviation"] },
      ],
    });

    const finals = [];
    const intermediates = [];
    const raws = [];

    products.forEach((p) => {
      if (p.type === "final") finals.push(p);
      else if (p.type === "intermediate") intermediates.push(p);
      else raws.push(p);
    });

    // 👉 Orden final: Finales → Intermedios → Materia prima
    const orderedProducts = [...finals, ...intermediates, ...raws];

    res.json(orderedProducts);

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
