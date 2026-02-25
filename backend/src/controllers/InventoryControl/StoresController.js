// controllers/InventoryControl/StoresController.js
import { Op } from "sequelize";
import fs from "fs";
import path from "path";
import fsp from "fs/promises";
import fileDirName from "../../libs/file-dirname.js";
import { Store } from "../../models/Inventory.js";

const { __dirname } = fileDirName(import.meta);

// === Config carpeta imágenes ===
// ⚠️ Este controller está en src/controllers/... => para llegar a src/img es ../../img
const IMG_BASE_DIR = path.join(__dirname, "../../img");
const imagePath = (relPath) => path.join(IMG_BASE_DIR, relPath);

const safeUnlink = (fullPath) => {
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (e) {
    console.warn("No se pudo borrar archivo:", fullPath, e?.message);
  }
};

const normalize = (p = "") =>
  String(p || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/");

// ¿La imagen está en uso por otros stores?
const isImageInUseElsewhere = async (filename, currentId = null) => {
  if (!filename) return false;

  const count = await Store.count({
    where: currentId
      ? { imageUrl: filename, id: { [Op.ne]: currentId } }
      : { imageUrl: filename },
  });

  return count > 0;
};

/**
 * POST /inventory/stores
 * multipart/form-data con edDeliUploadSingle
 */
export const createStore = async (req, res) => {
  let tempRelPath = null; // ✅ rollback si falla
  try {
    const payload = { ...req.body };

    // --- normalizaciones numéricas ---
    ["position", "latitude", "longitude"].forEach((k) => {
      if (k in payload && payload[k] !== null && payload[k] !== "") {
        payload[k] = Number(payload[k]);
      }
    });

    // --- booleanos ---
    if ("isActive" in payload) {
      payload.isActive = String(payload.isActive) === "true";
    }

    // --- required mínimos ---
    if (!payload.name || !String(payload.name).trim()) {
      return res.status(400).json({ message: "El campo 'name' es obligatorio." });
    }
    if (!payload.address || !String(payload.address).trim()) {
      return res.status(400).json({ message: "El campo 'address' es obligatorio." });
    }

    payload.name = String(payload.name).trim();
    payload.address = String(payload.address).trim();

    // ✅ IMAGEN: usar la ruta del input (subfolder) + nombre de archivo
    // Prioridad: subfolder del body (lo que puso el usuario en el form)
    if (req.file?.filename) {
      const subfolder = (req.body.subfolder || "EdDeli/stores").trim().replace(/\/+$/, "");
      tempRelPath = subfolder
        ? `${subfolder}/${req.file.filename}`
        : req.file.filename;
      payload.imageUrl = tempRelPath;
    }

    // ✅ NO guardar subfolder/customFileName en la tabla
    delete payload.subfolder;
    delete payload.customFileName;
    delete payload.moveImage;

    const row = await Store.create(payload);
    return res.status(201).json({ message: "Creado", store: row });
  } catch (error) {
    // rollback: si subió imagen y falló el create, borra archivo
    if (tempRelPath) safeUnlink(imagePath(tempRelPath));

    console.error("Error createStore:", error);
    return res.status(500).json({ message: "Error al crear Store", error: error?.message || error });
  }
};

/**
 * PUT /inventory/stores/:id
 * multipart/form-data con edDeliUploadSingle
 */
export const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await Store.findByPk(id);
    if (!row) return res.status(404).json({ message: "Store no encontrado" });

    const oldRel = normalize(row.imageUrl || "");
    const incomingRel = normalize(req.body.imageUrl || "");
    const updates = { ...req.body };

    let moved = false;

    // ===============================
    // 1️⃣ CASO: se sube imagen nueva (usar subfolder del form)
    // ===============================
    if (req.file?.filename) {
      const subfolder = (req.body.subfolder || "EdDeli/stores").trim().replace(/\/+$/, "");
      const newRel = subfolder
        ? `${subfolder}/${req.file.filename}`
        : req.file.filename;
      updates.imageUrl = newRel;

      // borrar anterior si no está en uso
      if (oldRel && oldRel !== newRel) {
        const used = await isImageInUseElsewhere(oldRel, row.id);
        if (!used) safeUnlink(imagePath(oldRel));
      }
    }

    // =================================================
    // 2️⃣ CASO CLAVE: NO hay archivo, pero cambió la ruta
    // =================================================
    else if (incomingRel && incomingRel !== oldRel) {
      const used = await isImageInUseElsewhere(oldRel, row.id);
      if (used) {
        return res.status(400).json({
          message: "La imagen está siendo usada por otros stores. No se puede mover.",
        });
      }

      const fromAbs = imagePath(oldRel);
      const toAbs = imagePath(incomingRel);

      if (!fs.existsSync(fromAbs)) {
        return res.status(404).json({
          message: "La imagen actual no existe físicamente en el servidor",
        });
      }

      await fsp.mkdir(path.dirname(toAbs), { recursive: true });
      await fsp.rename(fromAbs, toAbs);

      updates.imageUrl = incomingRel;
      moved = true;
    }

    // ===============================
    // Normalizaciones de campos
    // ===============================
    if ("position" in updates && updates.position !== "" && updates.position != null) {
      updates.position = Number(updates.position);
    }
    if ("latitude" in updates && updates.latitude !== "" && updates.latitude != null) {
      updates.latitude = Number(updates.latitude);
    }
    if ("longitude" in updates && updates.longitude !== "" && updates.longitude != null) {
      updates.longitude = Number(updates.longitude);
    }
    if ("isActive" in updates) {
      updates.isActive = String(updates.isActive) === "true";
    }
    if ("name" in updates && updates.name != null) updates.name = String(updates.name).trim();
    if ("address" in updates && updates.address != null) updates.address = String(updates.address).trim();

    // ✅ NO guardar subfolder/customFileName/moveImage
    delete updates.subfolder;
    delete updates.customFileName;
    delete updates.moveImage;

    // ===============================
    // 3️⃣ Actualiza BD
    // ===============================
    await row.update(updates);

    return res.json({
      message: moved ? "Store actualizado y la imagen fue movida" : "Store actualizado",
      store: row,
    });
  } catch (error) {
    console.error("Error updateStore:", error);
    return res.status(500).json({ message: "Error al actualizar Store", error: error?.message || error });
  }
};

export const getStores = async (req, res) => {
  try {
    const { isActive } = req.query;

    const where = {};
    // Si piden solo activos (ej: home), filtrar
    if (isActive === "true" || isActive === true) {
      where.isActive = true;
    } else if (isActive === "false" || isActive === false) {
      where.isActive = false;
    }

    const rows = await Store.findAll({
      where: Object.keys(where).length ? where : undefined,
      order: [["position", "ASC"], ["createdAt", "DESC"]],
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener Stores", error });
  }
};

export const getStoreById = async (req, res) => {
  try {
    const row = await Store.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Store no encontrado" });
    res.json(row);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener Store", error });
  }
};

export const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await Store.findByPk(id);
    if (!row) return res.status(404).json({ message: "Store no encontrado" });

    if (row.imageUrl) {
      const used = await isImageInUseElsewhere(row.imageUrl, row.id);
      if (!used) safeUnlink(imagePath(row.imageUrl));
    }

    await row.destroy();
    res.json({ message: "Store eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar Store", error });
  }
};
