// controllers/InventoryControl/StoresController.js
import { Op } from "sequelize";
import { join } from "path";
import fs from "fs";
import fileDirName from "../../libs/file-dirname.js";
import { Store } from "../../models/Inventory.js";
const { __dirname } = fileDirName(import.meta);

// Usamos la misma carpeta de imágenes que HomeProduct
const EDDELI_DIR = join(__dirname, "../../img/EdDeli");
const imagePath = (filename) => join(EDDELI_DIR, filename);

const safeUnlink = (fullPath) => {
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (e) {
    console.warn("No se pudo borrar archivo:", fullPath, e?.message);
  }
};

// ¿Esta imagen la usan otros stores?
const isImageInUseByOtherStores = async (filename, currentId = null) => {
  if (!filename) return false;
  const where = currentId
    ? { imageUrl: filename, id: { [Op.ne]: currentId } }
    : { imageUrl: filename };
  const count = await Store.count({ where });
  return count > 0;
};

/**
 * GET /api/stores
 * Query:
 *  - isActive=true|false
 *  - q=texto (busca en name, address, city, province)
 *  - limit=50
 *  - offset=0
 *  - orderBy=position|name|createdAt|city|province
 *  - orderDir=ASC|DESC
 */
export const getStores = async (req, res) => {
  try {
    const {
      isActive,
      q,
      limit = 50,
      offset = 0,
      orderBy = "position",
      orderDir = "ASC",
    } = req.query;

    const where = {};
    if (typeof isActive !== "undefined") where.isActive = String(isActive) === "true";

    if (q && q.trim()) {
      const like = { [Op.like]: `%${q}%` };
      where[Op.or] = [
        { name: like },
        { address: like },
        { city: like },
        { province: like },
      ];
    }

    const rows = await Store.findAll({
      where,
      limit: Number(limit),
      offset: Number(offset),
      order: [[orderBy, orderDir], ["createdAt", "DESC"]],
    });

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error getStores:", error);
    res.status(500).json({ message: "Error al obtener Stores" });
  }
};

export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await Store.findByPk(id);
    if (!row) return res.status(404).json({ message: "Store no encontrado" });
    res.status(200).json(row);
  } catch (error) {
    console.error("Error getStoreById:", error);
    res.status(500).json({ message: "Error al obtener Store" });
  }
};

/**
 * POST /api/stores
 * Body:
 *  - name (obligatorio)
 *  - address (obligatorio)
 *  - description, phone, email, city, province
 *  - position, isActive, createdBy
 *  - image: multipart/form-data (campo "image") → usa edDeliUploadSingle
 */
export const createStore = async (req, res) => {
  try {
    const {
      name,
      address,
      description = null,
      phone = null,
      email = null,
      city = null,
      province = null,
      position = 0,
      isActive = "true",
      createdBy = null,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "El campo 'name' es obligatorio." });
    }
    if (!address || !String(address).trim()) {
      return res.status(400).json({ message: "El campo 'address' es obligatorio." });
    }

    // Si subieron archivo, úsalo; si no, respeta imageUrl si vino en el body
    const imageUrl = req.file?.filename || req.body?.imageUrl || null;

    const row = await Store.create({
      name: String(name).trim(),
      address: String(address).trim(),
      description,
      phone,
      email,
      city,
      province,
      imageUrl, // guardamos solo filename (mismo patrón que HomeProduct)
      position: Number(position) || 0,
      isActive: String(isActive) === "true",
      createdBy,
    });

    res.status(201).json({ message: "Creado", store: row });
  } catch (error) {
    console.error("Error createStore:", error);
    res.status(500).json({ message: "Error al crear Store" });
  }
};

/**
 * PUT /api/stores/:id
 * Body (parcial):
 *  - name, address, description, phone, email, city, province
 *  - position, isActive, clearImage
 *  - image: multipart/form-data (campo "image")
 */
export const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await Store.findByPk(id);
    if (!row) return res.status(404).json({ message: "No encontrado" });

    const {
      name,
      address,
      description,
      phone,
      email,
      city,
      province,
      position,
      isActive,
      clearImage, // "true" para limpiar
    } = req.body;

    const updates = {};

    if (typeof name !== "undefined") {
      if (!String(name).trim()) return res.status(400).json({ message: "Nombre vacío" });
      updates.name = String(name).trim();
    }
    if (typeof address !== "undefined") {
      if (!String(address).trim()) return res.status(400).json({ message: "Dirección vacía" });
      updates.address = String(address).trim();
    }
    if (typeof description !== "undefined") updates.description = description;
    if (typeof phone !== "undefined") updates.phone = phone;
    if (typeof email !== "undefined") updates.email = email;
    if (typeof city !== "undefined") updates.city = city;
    if (typeof province !== "undefined") updates.province = province;
    if (typeof position !== "undefined") updates.position = Number(position) || 0;
    if (typeof isActive !== "undefined") updates.isActive = String(isActive) === "true";

    // 1) limpiar imagen explícitamente
    if (String(clearImage) === "true" && row.imageUrl) {
      const used = await isImageInUseByOtherStores(row.imageUrl, row.id);
      if (!used) safeUnlink(imagePath(row.imageUrl));
      updates.imageUrl = null;
    }

    // 2) si subieron una NUEVA imagen
    if (req.file?.filename) {
      if (row.imageUrl) {
        const used = await isImageInUseByOtherStores(row.imageUrl, row.id);
        if (!used) safeUnlink(imagePath(row.imageUrl));
      }
      updates.imageUrl = req.file.filename;
    } else if (typeof req.body.imageUrl !== "undefined") {
      // mantener o poner null (si vino vacío) sin tocar archivos
      updates.imageUrl = req.body.imageUrl || null;
    }

    await row.update(updates);
    res.status(200).json({ message: "Actualizado", store: row });
  } catch (error) {
    console.error("Error updateStore:", error);
    res.status(500).json({ message: "Error al actualizar Store" });
  }
};

/**
 * DELETE /api/stores/:id
 * - Borra el store y su imagen si no está usada por otros stores
 */
export const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await Store.findByPk(id);
    if (!row) return res.status(404).json({ message: "Store no encontrado" });

    if (row.imageUrl) {
      const used = await isImageInUseByOtherStores(row.imageUrl, row.id);
      if (!used) safeUnlink(imagePath(row.imageUrl));
    }

    await row.destroy();
    res.status(200).json({ message: "Store eliminado correctamente." });
  } catch (error) {
    console.error("Error deleteStore:", error);
    res.status(500).json({ message: "Error al eliminar Store" });
  }
};
