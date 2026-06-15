// routes/inventoryRoutes.js
import express from 'express';
import { isAuthenticated, requireProgrammer } from "../middlewares/authMiddelware.js";

// Product Controllers
import {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  patchProductStock,
} from '../controllers/InventoryControl/ProductController.js';

import {
  getGenericIngredientsWorkbench,
  bootstrapGenericIngredients,
  createGenericIngredient,
  createPresentation,
  linkPresentation,
  unlinkPresentation,
} from '../controllers/InventoryControl/GenericIngredientController.js';

// Movement and Recipe Controllers (aún en InventoryController.js)
import { 
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeCosting,
} from '../controllers/InventoryControl/RecipeController.js';

// Category Controllers
import {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
} from '../controllers/InventoryControl/CategoryController.js';

// Unit Controllers
import {
  createUnit,
  getAllUnits,
  updateUnit,
  deleteUnit,
} from '../controllers/InventoryControl/UnitController.js';


import {
  registerMovement,
  getMovementsByProduct,
  getAllMovements,
  updateMovement,
  deleteMovement,
  updateMovementsDateBatch,
  registerProductionIntermediateFromPayload,
  registerProductionFinalFromPayload
} from '../controllers/InventoryControl/MovementController.js';


// routes/customerRoutes.js
import { 
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
 } from '../controllers/InventoryControl/CustomerController.js';
import { simulateFromIntermediate, simulateProductionController } from '../controllers/InventoryControl/ProductionManagerController.js';
import { 
  getHomeProducts,
  getHomeProductById,
createHomeProduct,
updateHomeProduct,
deleteHomeProduct,
 } from '../controllers/InventoryControl/HomeProductController.js';   
import { edDeliUploadSingle } from '../middlewares/uploadEddDeliMiddleware.js';
import {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
} from "../controllers/InventoryControl/StoresController.js";
// CatalogController: CRUD admin + template-items (diseño promocional)
import {
  getCatalogEntries,
  createCatalogEntry,
  updateCatalogEntry,
  deleteCatalogEntry,
  reorderCatalogEntries,
  getPopularProducts,
  getAutoCatalogSeed,
  getCatalogTemplateItems,
} from "../controllers/InventoryControl/CatalogController.js";
// CatalogVitrinaController: vitrina/backery (CatalogPage)
import {
  getCatalogBySection,
  getCatalogBySections,
} from "../controllers/InventoryControl/CatalogVitrinaController.js";

import {
  getProductsByStore,
  addProductsToStore,
  removeProductFromStore,
  toggleStoreProduct,
  getStoresByProduct,
} 
from '../controllers/InventoryControl/StoreProductsController.js';

const router = express.Router();


// productos de una tienda (lectura pública; mutaciones requieren sesión)
router.get("/stores/:storeId/products", getProductsByStore);
router.post("/stores/:storeId/products", isAuthenticated, addProductsToStore);
router.delete("/stores/:storeId/products/:productId", isAuthenticated, removeProductFromStore);
router.patch("/stores/:storeId/products/:productId", isAuthenticated, toggleStoreProduct);

// tiendas que tienen un producto (opcional)
// router.get("/products/:productId/stores", getStoresByProduct);


// ----------------------------------
// 📋 CATÁLOGO (CatalogController + CatalogVitrinaController)
// ----------------------------------
// CatalogController: admin CRUD, template-items (publicidad), populares
router.get("/getPopularProducts", getPopularProducts);
router.get("/getAutoCatalogSeed", getAutoCatalogSeed);
router.get("/catalog", getCatalogEntries);
router.get("/catalog/template-items", getCatalogTemplateItems); // → ProductSelector (diseño promocional)
router.post("/catalog", isAuthenticated, createCatalogEntry);
router.put("/catalog/:id", isAuthenticated, updateCatalogEntry);
router.delete("/catalog/:id", isAuthenticated, deleteCatalogEntry);
router.post("/catalog/reorder", isAuthenticated, reorderCatalogEntries);
// CatalogVitrinaController: vitrina /backery (CatalogPage)
router.get("/catalog/section/:section", getCatalogBySection);   // → CatalogPage
router.get("/catalog/sections", getCatalogBySections);



// Locales: GET público (catálogo / punto de venta); crear/editar/borrar solo autenticado
router.get("/stores/", getStores);
router.get("/stores/:id", getStoreById);
router.post("/stores/", isAuthenticated, edDeliUploadSingle, createStore);
router.put("/stores/:id", isAuthenticated, edDeliUploadSingle, updateStore);
router.delete("/stores/:id", isAuthenticated, deleteStore);

// ----------------------------------
// 🔁 Home Products
// ----------------------------------

router.get('/homeproducts', getHomeProducts);
router.post("/homeproducts", isAuthenticated, edDeliUploadSingle, createHomeProduct);
router.put("/homeproducts/:id", isAuthenticated, edDeliUploadSingle, updateHomeProduct);
router.delete("/homeproducts/:id", isAuthenticated, deleteHomeProduct);



// ----------------------------------
// 🔁 CLIENTES
// ----------------------------------

router.get('/customers', isAuthenticated, getAllCustomers);
router.post('/customers', isAuthenticated, createCustomer);
router.put('/customers/:id', isAuthenticated, updateCustomer);
router.delete('/customers/:id', isAuthenticated, deleteCustomer);
// ----------------------------------
// 📦 PRODUCTOS
// ----------------------------------
router.post('/products', isAuthenticated, edDeliUploadSingle, createProduct);            // Crear producto
router.get('/products', isAuthenticated, getAllProducts);           // Obtener todos los productos
router.patch('/products/:id/stock', isAuthenticated, requireProgrammer, patchProductStock);
router.put('/products/:id', isAuthenticated, edDeliUploadSingle, updateProduct);        // Editar producto
router.delete('/products/:id', isAuthenticated, deleteProduct);     // Eliminar producto

// ----------------------------------
// 🧪 INSUMOS GENÉRICOS Y PRESENTACIONES
// ----------------------------------
router.get('/generic-ingredients', isAuthenticated, getGenericIngredientsWorkbench);
router.post('/generic-ingredients/bootstrap', isAuthenticated, bootstrapGenericIngredients);
router.post('/generic-ingredients', isAuthenticated, createGenericIngredient);
router.post('/generic-ingredients/:genericId/presentations', isAuthenticated, createPresentation);
router.patch('/generic-ingredients/presentations/:productId/link', isAuthenticated, linkPresentation);
router.patch('/generic-ingredients/presentations/:productId/unlink', isAuthenticated, unlinkPresentation);

// ----------------------------------
// 🔁 MOVIMIENTOS
// ----------------------------------
// Registrar un nuevo movimiento de inventario
router.post('/movements', isAuthenticated, registerMovement);
router.put('/movements/batch/date', isAuthenticated, updateMovementsDateBatch);
router.put('/movements/:movementId', isAuthenticated, updateMovement);
router.delete('/movements/:movementId', isAuthenticated, deleteMovement);
router.get("/simulate-production", isAuthenticated,simulateProductionController);
router.get("/simulateFromIntermediate", isAuthenticated,simulateFromIntermediate);

// Obtener todos los movimientos por producto
router.get('/movements',isAuthenticated, getAllMovements);
router.get('/movements/:productId',isAuthenticated, getMovementsByProduct);

router.post("/registerProductionIntermediateFromPayload", isAuthenticated,registerProductionIntermediateFromPayload);
router.post("/registerProductionFinalFromPayload", isAuthenticated,registerProductionFinalFromPayload);

// ----------------------------------
// 🍳 RECETAS (opcional)
// ----------------------------------


// Obtener receta de un producto final
router.get('/recipes/:productFinalId', isAuthenticated, getRecipe);
router.get('/recipes/getRecipeCosting/:productFinalId', getRecipeCosting);

// Crear receta completa (uno o varios insumos)
router.post('/recipes', isAuthenticated, createRecipe);

// Editar cantidad de un insumo en la receta
router.put('/recipes/:id', isAuthenticated, updateRecipe);

// Eliminar un insumo de la receta
router.delete('/recipes/:id', isAuthenticated, deleteRecipe);

// ----------------------------------
// 🏷️ CATEGORÍAS
// ----------------------------------
router.post('/categories', isAuthenticated, createCategory);        // Crear categoría
router.get('/categories', getAllCategories);       // Listar categorías
router.put('/categories/:id', isAuthenticated, updateCategory);     // Editar categoría
router.delete('/categories/:id', isAuthenticated, deleteCategory);  // Eliminar categoría

// ----------------------------------
// 📏 UNIDADES
// ----------------------------------
router.post('/units', isAuthenticated, createUnit);                 // Crear unidad
router.get('/units', isAuthenticated, getAllUnits);                 // Listar unidades
router.put('/units/:id', isAuthenticated, updateUnit);              // Editar unidad
router.delete('/units/:id', isAuthenticated, deleteUnit);           // Eliminar unidad




export default router;
