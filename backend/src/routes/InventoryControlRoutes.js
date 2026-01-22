// routes/inventoryRoutes.js
import express from 'express';
import { isAuthenticated } from "../middlewares/authMiddelware.js";

// Product Controllers
import {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
} from '../controllers/InventoryControl/ProductController.js';

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
// routes/inventory/catalog.routes.js
import {
  getCatalogEntries,
  createCatalogEntry,
  updateCatalogEntry,
  deleteCatalogEntry,
  reorderCatalogEntries,
  getCatalogBySection,
  getCatalogBySections,
  getPopularProducts,
getAutoCatalogSeed,
getCatalogTemplateItems,
} from "../controllers/InventoryControl/CatalogController.js";

import {
  getProductsByStore,
  addProductsToStore,
  removeProductFromStore,
  toggleStoreProduct,
  getStoresByProduct,
} 
from '../controllers/InventoryControl/StoreProductsController.js';

const router = express.Router();


// productos de una tienda
router.get("/stores/:storeId/products", getProductsByStore);
router.post("/stores/:storeId/products", addProductsToStore);
router.delete("/stores/:storeId/products/:productId", removeProductFromStore);
router.patch("/stores/:storeId/products/:productId", toggleStoreProduct);

// tiendas que tienen un producto (opcional)
// router.get("/products/:productId/stores", getStoresByProduct);


// Listado general con filtros
router.get("/getPopularProducts", getPopularProducts);
router.get("/getAutoCatalogSeed", getAutoCatalogSeed);
router.get("/catalog", getCatalogEntries);
router.get("/catalog/template-items", getCatalogTemplateItems);
// Alias por sección (ej: /inventory/catalog/home)
// CRUD
router.post("/catalog", isAuthenticated, createCatalogEntry);
router.put("/catalog/:id", isAuthenticated, updateCatalogEntry);
router.delete("/catalog/:id", isAuthenticated, deleteCatalogEntry);

// Opcional: reordenar por sección
router.post("/catalog/reorder", isAuthenticated, reorderCatalogEntries);


router.get("/catalog/section/:section", getCatalogBySection);
router.get("/catalog/sections", getCatalogBySections);



router.get("/stores/", getStores);
router.get("/stores/:id", getStoreById);
router.post("/stores/", edDeliUploadSingle, createStore);
router.put("/stores/:id", edDeliUploadSingle, updateStore);
router.delete("/stores/:id", deleteStore);

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
router.put('/products/:id', isAuthenticated, edDeliUploadSingle, updateProduct);        // Editar producto
router.delete('/products/:id', isAuthenticated, deleteProduct);     // Eliminar producto

// ----------------------------------
// 🔁 MOVIMIENTOS
// ----------------------------------
// Registrar un nuevo movimiento de inventario
router.post('/movements', isAuthenticated, registerMovement);
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
