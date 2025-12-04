import { InventoryProduct, InventoryMovement, InventoryRecipe } from "../../models/Inventory.js";
// controllers/inventoryController.js

// Crear receta (opcional)
export const createRecipe = async (req, res) => {
  try {
    const { productFinalId, productRawId, quantity } = req.body;
    const recipe = await InventoryRecipe.create({ productFinalId, productRawId, quantity });
    res.status(201).json(recipe);
  } catch (err) {
    res.status(500).json({ message: 'Error al crear receta', error: err });
  }
};

// Obtener receta de un producto final
export const getRecipe = async (req, res) => {
  try {
    const { productFinalId } = req.params;
    const recipe = await InventoryRecipe.findAll({ where: { productFinalId } });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener receta', error: err });
  }
};


