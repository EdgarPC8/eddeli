import axios, { jwt } from './axios.js';


export const getPopularProducts = (params = {}) =>
  axios.get(`inventory/getPopularProducts`, {
    params, // ej: { days:30, limit:20, orderBy:'sold30', type:'final', activeOnly:true }
    headers: { Authorization: jwt() },
  });

export const getAutoCatalogSeed = (params = {}) =>
  axios.get(`inventory/getAutoCatalogSeed`, {
    params, // ej: { days:30, limit:20, section:'home', onlyActive:true }
    headers: { Authorization: jwt() },
  });


// src/api/inventoryControlRequest.js  (añade/expórtalos aquí)

// Listar items del catálogo (puedes pasar filtros por query)
export const getCatalogEntries = (params = {}) =>
  axios.get("/inventory/catalog", {
    params, // ej: { section: 'home', isActive: true, q: 'pan', limit: 50, offset: 0 }
    headers: { Authorization: jwt() },
  });
  export const getCatalogTemplateItems = (params = {}) => {
    return axios.get("/inventory/catalog/template-items", {
      params: {
        onlyActive: true,
        onlyValidNow: true,
        ...params, // storeId, q, etc.
      },
    });
  };

// Crear un item de catálogo (JSON, sin archivos)
export const createCatalogEntry = (payload) =>
  axios.post("/inventory/catalog", payload, {
    headers: {
      Authorization: jwt(),
      "Content-Type": "application/json",
    },
  });

// Actualizar un item de catálogo
export const updateCatalogEntry = (id, payload) =>
  axios.put(`/inventory/catalog/${id}`, payload, {
    headers: {
      Authorization: jwt(),
      "Content-Type": "application/json",
    },
  });

// Eliminar un item de catálogo
export const deleteCatalogEntry = (id) =>
  axios.delete(`/inventory/catalog/${id}`, {
    headers: { Authorization: jwt() },
  });

// Reordenar entradas del catálogo por posición
export const reorderCatalogEntries = (payload) =>
  axios.post("/inventory/catalog/reorder", payload, {
    headers: {
      Authorization: jwt(),
      "Content-Type": "application/json",
    },
  });
// Obtener catálogo por sección (formato consumidor)
export const getCatalogBySection = (section, params = {}) =>
  axios.get(`/inventory/catalog/section/${section}`, {
    params, // opcional: { storeId, onlyActive }
  });
// Obtener varias secciones del catálogo
export const getCatalogBySections = (sections = [], params = {}) => {
  const query = {
    sections: Array.isArray(sections) ? sections.join(",") : sections,
    ...params, // opcional: { storeId, onlyActive }
  };
  return axios.get("/inventory/catalog/sections", { params: query });
};

// Grupos comparativos de productos (pasteles, etc.)
export const getPublicCompareGroups = (params = {}) =>
  axios.get("/inventory/compare-groups/public", { params });

export const getCompareGroups = (params = {}) =>
  axios.get("/inventory/compare-groups", {
    params,
    headers: { Authorization: jwt() },
  });

export const getCompareGroupById = (id) =>
  axios.get(`/inventory/compare-groups/${id}`, {
    headers: { Authorization: jwt() },
  });

export const createCompareGroup = (payload) =>
  axios.post("/inventory/compare-groups", payload, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const updateCompareGroup = (id, payload) =>
  axios.put(`/inventory/compare-groups/${id}`, payload, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const deleteCompareGroup = (id) =>
  axios.delete(`/inventory/compare-groups/${id}`, {
    headers: { Authorization: jwt() },
  });

export const bootstrapPastelesCompareGroup = () =>
  axios.post("/inventory/compare-groups/bootstrap-pasteles", null, {
    headers: { Authorization: jwt() },
  });




// 🟢 INSUMOS GENÉRICOS Y PRESENTACIONES

export const getGenericIngredientsWorkbench = async () =>
  await axios.get("/inventory/generic-ingredients", {
    headers: { Authorization: jwt() },
  });

export const bootstrapGenericIngredientsRequest = async () =>
  await axios.post("/inventory/generic-ingredients/bootstrap", null, {
    headers: { Authorization: jwt() },
  });

export const createGenericIngredientRequest = async (data) =>
  await axios.post("/inventory/generic-ingredients", data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const createPresentationRequest = async (genericId, data) =>
  await axios.post(`/inventory/generic-ingredients/${genericId}/presentations`, data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const linkPresentationRequest = async (productId, data) =>
  await axios.patch(`/inventory/generic-ingredients/presentations/${productId}/link`, data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const unlinkPresentationRequest = async (productId) =>
  await axios.patch(`/inventory/generic-ingredients/presentations/${productId}/unlink`, null, {
    headers: { Authorization: jwt() },
  });

// 🟢 PRODUCTOS

// Obtener todos los productos con categoría y unidad asociadas
export const getAllProducts = async () =>
  await axios.get('/inventory/products', {
    headers: { Authorization: jwt() },
  });

// Crear un nuevo producto
export const createProduct = async (data) =>
  await axios.post('/inventory/products', data, {
    headers: { Authorization: jwt() },
  });

// Editar un producto existente por ID
export const updateProduct = async (id, data) =>
  await axios.put(`/inventory/products/${id}`, data, {
    headers: { Authorization: jwt() },
  });

/** Ajuste directo de stock/minStock (solo Programador, sin movimiento). */
export const patchProductStockRequest = async (id, data) =>
  await axios.patch(`/inventory/products/${id}/stock`, data, {
    headers: { Authorization: jwt() },
  });

// Eliminar un producto por ID
export const deleteProduct = async (id) =>
  await axios.delete(`/inventory/products/${id}`, {
    headers: { Authorization: jwt() },
  });


// 🔁 MOVIMIENTOS

// Registrar un movimiento de inventario (entrada, salida, ajuste, producción)
// 🔁 MOVIMIENTOS DE INVENTARIO

// Crear movimiento
export const registerMovementsBatchRequest = async (items, date) =>
  await axios.post(
    "/inventory/movements/batch",
    { items, ...(date ? { date } : {}) },
    { headers: { Authorization: jwt() } },
  );

export const registerMovement = async (data) =>
  await axios.post('/inventory/movements', data, {
    headers: { Authorization: jwt() },
  });

export const openPresentationMovementRequest = async (data) =>
  await axios.post('/inventory/movements/open-presentation', data, {
    headers: { Authorization: jwt() },
  });

export const updateMovement = async (movementId, data) =>
  await axios.put(`/inventory/movements/${movementId}`, data, {
    headers: { Authorization: jwt() },
  });

export const deleteMovement = async (movementId) =>
  await axios.delete(`/inventory/movements/${movementId}`, {
    headers: { Authorization: jwt() },
  });

/** Actualizar fecha de varios movimientos (p. ej. toda una producción) — solo Programador */
export const updateMovementsDateBatch = async (data) =>
  await axios.put("/inventory/movements/batch/date", data, {
    headers: { Authorization: jwt() },
  });

// Obtener movimientos por producto
export const getMovementsByProduct = async (productId) =>
  await axios.get(`/inventory/movements/${productId}`, {
    headers: { Authorization: jwt() },
  });

  export const getAllMovements = async () =>
  await axios.get("/inventory/movements", {
    headers: { Authorization: jwt() },
  });

export const simulateProduction = async (productId, cantidad) =>
  await axios.get("/inventory/simulate-production", {
    params: {
      productId,
      cantidad,
    },
    headers: { Authorization: jwt() },
  });
  export const registerProductionIntermediateFromPayload = async (payload) =>
  await axios.post("/inventory/registerProductionIntermediateFromPayload", payload, {
    headers: { Authorization: jwt() },
  });
  export const registerProductionFinalFromPayload = async (payload) =>
  await axios.post("/inventory/registerProductionFinalFromPayload", payload, {
    headers: { Authorization: jwt() },
  });
export const simulateFromIntermediate = async (intermediateId) =>
  await axios.get("/inventory/simulateFromIntermediate", {
    params: {
      intermediateId,
    },
    headers: { Authorization: jwt() },
  });





// 🔧 RECETAS

// Obtener receta de un producto final
export const getRecipeByProduct = async (productFinalId) =>
  await axios.get(`/inventory/recipes/${productFinalId}`, {
    headers: { Authorization: jwt() },
  });

// api/inventoryControlRequest.js
export const getRecipeCosting = (
  productFinalId,
  { extrasPercent = 0, laborPercent = 0, producedQty = 0, debug = 0 } = {}
) => {
  return axios.get(`/inventory/recipes/getRecipeCosting/${productFinalId}`, {
    headers: { Authorization: jwt() },
    params: { extrasPercent, laborPercent, producedQty, debug },
  });
};


// Crear receta (uno o varios ingredientes)
export const createRecipeRequest = async (data) =>
  await axios.post(`/inventory/recipes`, data, {
    headers: { Authorization: jwt() },
  });

// Editar una línea de receta (cantidad)
export const updateRecipeRequest = async (id, data) =>
  await axios.put(`/inventory/recipes/${id}`, data, {
    headers: { Authorization: jwt() },
  });

// Eliminar un ingrediente de la receta
export const deleteRecipeRequest = async (id) =>
  await axios.delete(`/inventory/recipes/${id}`, {
    headers: { Authorization: jwt() },
  });



// 🏷️ CATEGORÍAS

// Obtener todas las categorías
export const getCategories = (params = {}) =>
  axios.get("/inventory/categories", {
    params, // ej: { public: true } o { isActive: true }
    headers: { Authorization: jwt() },
  });

// Crear una nueva categoría
export const createCategoryRequest = async (data) =>
  await axios.post('/inventory/categories', data, {
    headers: { Authorization: jwt() },
  });

// Editar una categoría por ID
export const updateCategoryRequest = async (id, data) =>
  await axios.put(`/inventory/categories/${id}`, data, {
    headers: { Authorization: jwt() },
  });

// Eliminar una categoría por ID
export const deleteCategoryRequest = async (id) =>
  await axios.delete(`/inventory/categories/${id}`, {
    headers: { Authorization: jwt() },
  });


// 📏 UNIDADES

// Obtener todas las unidades
export const getUnits = async () =>
  await axios.get('/inventory/units', {
    headers: { Authorization: jwt() },
  });

// Crear una nueva unidad
export const createUnitRequest = async (data) =>
  await axios.post('/inventory/units', data, {
    headers: { Authorization: jwt() },
  });

// Editar una unidad por ID
export const updateUnitRequest = async (id, data) =>
  await axios.put(`/inventory/units/${id}`, data, {
    headers: { Authorization: jwt() },
  });

// Eliminar una unidad por ID
export const deleteUnitRequest = async (id) =>
  await axios.delete(`/inventory/units/${id}`, {
    headers: { Authorization: jwt() },
  });



export const getAllCustomersRequest = async () =>
  await axios.get('/inventory/customers', { headers: { Authorization: jwt() } });

export const createCustomerRequest = async (data) =>
  await axios.post('/inventory/customers', data, { headers: { Authorization: jwt() } });

export const updateCustomerRequest = async (id, data) =>
  await axios.put(`/inventory/customers/${id}`, data, { headers: { Authorization: jwt() } });

export const deleteCustomerRequest = async (id) =>
  await axios.delete(`/inventory/customers/${id}`, { headers: { Authorization: jwt() } });



// api/inventoryControlRequest.js (resumen)


export const getHomeProductsRequest = (params) =>
  axios.get("/inventory/homeproducts", { params ,headers: { Authorization: jwt() } });

export const deleteHomeProductRequest = (id) =>
  axios.delete(`/inventory/homeproducts/${id}`,{ headers: { Authorization: jwt() } });

  export const createHomeProductRequest = (formData) =>
  axios.post("/inventory/homeproducts", formData, {
    headers: { "Content-Type": "multipart/form-data",Authorization: jwt() },
  });

export const updateHomeProductRequest = (id, formData) =>
  axios.put(`/inventory/homeproducts/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data",Authorization: jwt() },
  });

  
/* ===== Productos por tienda (nuevo) ===== */
export const getStoreProductsRequest = (storeId, params) =>
  axios.get(`/inventory/stores/${storeId}/products`, {
    params, // { activeOnly, q }
    headers: { Authorization: jwt() },
  });

/** Productos ofrecidos en un local — sin cabecera de auth (vista pública de locales, ej. /punto_venta). */
export const getStoreProductsPublicRequest = (storeId, params = {}) =>
  axios.get(`/inventory/stores/${storeId}/products`, {
    params: { activeOnly: true, ...params },
  });

export const addProductsToStoreRequest = (storeId, productIds) =>
  axios.post(
    `/inventory/stores/${storeId}/products`,
    { productIds }, // array de IDs
    { headers: { Authorization: jwt() } }
  );

export const removeProductFromStoreRequest = (storeId, productId) =>
  axios.delete(`/inventory/stores/${storeId}/products/${productId}`, {
    headers: { Authorization: jwt() },
  });

export const toggleStoreProductRequest = (storeId, productId, isActive) =>
  axios.patch(
    `/inventory/stores/${storeId}/products/${productId}`,
    { isActive },
    { headers: { Authorization: jwt() } }
  );

// Catálogo de productos finales para el selector
export const getFinalProductsRequest = (params) =>
  axios.get("/inventory/products", {
    // el backend debe soportar filtros: type='final', q
    params: { type: "final", isActive: true, ...params },
    headers: { Authorization: jwt() },
  });
  // Obtener lista de stores
export const getStoresRequest = (params) =>
axios.get("/inventory/stores", {
  params,
  headers: { Authorization: jwt() },
});

// Obtener un store por ID
export const getStoreByIdRequest = (id) =>
axios.get(`/inventory/stores/${id}`, {
  headers: { Authorization: jwt() },
});

export const createStoreRequest = (formData) =>
  axios.post("/inventory/stores", formData, {
    headers: { Authorization: jwt() }, // ✅ sin Content-Type
  });

export const updateStoreRequest = (id, formData) =>
  axios.put(`/inventory/stores/${id}`, formData, {
    headers: { Authorization: jwt() }, // ✅ sin Content-Type
  });

// Eliminar store (igual)
export const deleteStoreRequest = (id) =>
  axios.delete(`/inventory/stores/${id}`, {
    headers: { Authorization: jwt() },
  });

