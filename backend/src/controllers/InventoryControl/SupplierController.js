import { Supplier } from "../../models/Orders.js";

export const getAllSuppliers = async (_req, res) => {
  try {
    const rows = await Supplier.findAll({ order: [["name", "ASC"]] });
    res.json(rows);
  } catch (error) {
    console.error("getAllSuppliers:", error);
    res.status(500).json({ message: "Error al obtener proveedores" });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ message: "El nombre del proveedor es obligatorio" });
    }
    const row = await Supplier.create({
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
    });
    res.status(201).json(row);
  } catch (error) {
    console.error("createSupplier:", error);
    res.status(500).json({ message: "Error al crear proveedor" });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const row = await Supplier.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Proveedor no encontrado" });
    const { name, phone, email, address, notes } = req.body || {};
    if (name != null && !String(name).trim()) {
      return res.status(400).json({ message: "El nombre del proveedor es obligatorio" });
    }
    await row.update({
      ...(name != null ? { name: String(name).trim() } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...(address !== undefined ? { address: address || null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
    });
    res.json(row);
  } catch (error) {
    console.error("updateSupplier:", error);
    res.status(500).json({ message: "Error al actualizar proveedor" });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const deleted = await Supplier.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Proveedor no encontrado" });
    res.json({ message: "Proveedor eliminado" });
  } catch (error) {
    console.error("deleteSupplier:", error);
    res.status(500).json({ message: "Error al eliminar proveedor" });
  }
};
