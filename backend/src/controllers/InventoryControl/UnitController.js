import { InventoryUnit } from "../../models/Inventory.js";

  // controllers/inventoryUnitController.js
  export const createUnit = async (req, res) => {
    try {
      const unit = await InventoryUnit.create(req.body);
      res.status(201).json(unit);
    } catch (err) {
      res.status(500).json({ message: 'Error al crear unidad', error: err });
    }
  };
  
  export const getAllUnits = async (req, res) => {
    try {
      const units = await InventoryUnit.findAll();
      res.json(units);
    } catch (err) {
      res.status(500).json({ message: 'Error al obtener unidades', error: err });
    }
  };
  
  export const updateUnit = async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await InventoryUnit.update(req.body, { where: { id } });
      res.json({ message: 'Unidad actualizada', updated });
    } catch (err) {
      res.status(500).json({ message: 'Error al actualizar unidad', error: err });
    }
  };
  
  export const deleteUnit = async (req, res) => {
    try {
      const { id } = req.params;
      await InventoryUnit.destroy({ where: { id } });
      res.json({ message: 'Unidad eliminada' });
    } catch (err) {
      res.status(500).json({ message: 'Error al eliminar unidad', error: err });
    }
  };
  
  
