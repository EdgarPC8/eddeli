import { DataTypes } from 'sequelize';
import { sequelize } from '../database/connection.js';
import { Account } from './Account.js';

// models/Catalog.js



export const InventoryMovement = sequelize.define('ERP_inventory_movements', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: false },

  description: { type: DataTypes.TEXT },

  // costo unitario (para entradas/producción y para valorar pérdidas)
  price: { type: DataTypes.FLOAT, allowNull: true },

  type: { type: DataTypes.ENUM("entrada", "salida", "ajuste", "produccion"), allowNull: false },

  // NUEVO: motivo específico
  reason: {
    type: DataTypes.ENUM(
      "ENTRADA_PRODUCCION",     // entra por producción propia
      "ENTRADA_COMPRA",         // entra por compra a proveedor
  
      "SALIDA_VENTA",           // sale por venta / entrega de pedido
      "SALIDA_YAPA",            // sale por yapa / regalo
      "SALIDA_DANIADO",         // sale por producto dañado
      "SALIDA_CADUCADO",        // sale por producto caducado
      "SALIDA_CONSUMO_INTERNO", // sale por consumo interno
  
      "AJUSTE_ENTRADA",         // ajuste positivo (sobrante)
      "AJUSTE_SALIDA"           // ajuste negativo (faltante)
    ),
    allowNull: true
  },
  referenceType: { type: DataTypes.STRING, allowNull: true }, // "order", "purchase", "production", etc.
  referenceId: { type: DataTypes.INTEGER, allowNull: true },

  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  createdBy: { type: DataTypes.INTEGER, allowNull: false }
});



// Tabla de recetas: define qué productos (insumos) componen un producto final
export const InventoryRecipe = sequelize.define('ERP_inventory_recipes', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  productFinalId: { type: DataTypes.INTEGER, allowNull: false }, // Producto final
  productRawId: { type: DataTypes.INTEGER, allowNull: false },   // Insumo
  quantity: { type: DataTypes.FLOAT, allowNull: false },         // Cantidad del insumo
  isQuantityInGrams: { type: DataTypes.BOOLEAN,defaultValue:false},       // Cantidad del insumo
  itemType: { 
    type: DataTypes.ENUM('insumo', 'material'), 
    allowNull: false, 
    defaultValue: 'insumo' 
  }
}, {
  timestamps: false
});

export const InventoryCategory = sequelize.define("ERP_inventory_categories", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: { type: DataTypes.TEXT },
  isPublic: {            // 👈 nueva columna
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

}, {
  timestamps: false
});

export const InventoryUnit = sequelize.define('ERP_inventory_units', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  abbreviation: { type: DataTypes.STRING, allowNull: false }, // Ej: kg, l, un
  description: { type: DataTypes.STRING },
  factor: { type: DataTypes.FLOAT, defaultValue: 0 },

}, {
  timestamps: false
});
export const InventoryProduct = sequelize.define('ERP_inventory_products', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  desc: { type: DataTypes.TEXT, defaultValue: null },
  type: {
    type: DataTypes.ENUM('raw', 'intermediate', 'final'),
    defaultValue: 'raw',
    allowNull: false,
  },
  unitId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'ERP_inventory_units', key: 'id' },
  },

  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'ERP_inventory_categories', key: 'id' },
  },

  standardWeightGrams: { type: DataTypes.FLOAT, defaultValue: 0 },
  netWeight: { type: DataTypes.FLOAT, defaultValue: 0 },

  stock: { type: DataTypes.FLOAT, defaultValue: 0 },
  minStock: { type: DataTypes.FLOAT, defaultValue: 0 },

  // 💰 Precios
  price: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  wholesaleRules: { type: DataTypes.JSON, allowNull: true },
  distributorPrice: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  taxRate: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 }, // % IVA
  // 📦 Identificadores
  sku: { type: DataTypes.STRING(64), unique: true, allowNull: true },
  barcode: { type: DataTypes.STRING(64), unique: true, allowNull: true },

  // 🏷️ Estado y metadatos
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  primaryImageUrl: { type: DataTypes.STRING(500), allowNull: true }, // imagen rápida para listado
}, {
  timestamps: true,
  indexes: [
    { fields: ['categoryId'] },
    { fields: ['type'] },
    { fields: ['isActive'] },
    { unique: true, fields: ['sku'] },
  ],
});



export const HomeProduct = sequelize.define("ERP_home_products", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  // FK al producto "real" del inventario (puede ser NULL si es puramente visual)
  productId: { type: DataTypes.INTEGER, allowNull: true },

  // Campos “desacoplados” para mostrar en el Home (pueden diferir del producto base)
  name: { type: DataTypes.STRING, allowNull: false },          // título que se muestra
  description: { type: DataTypes.TEXT, allowNull: true },      // descripción corta
  imageUrl: { type: DataTypes.STRING(500), allowNull: true },  // imagen para el home
  priceOverride: { type: DataTypes.FLOAT, allowNull: true },   // precio opcional para mostrar (si difiere)

  // Meta para vitrina
  section: {
    type: DataTypes.ENUM("home", "offers", "recommended", "new"),
    allowNull: false,
    defaultValue: "home",
  },
  badge: { type: DataTypes.STRING(50), allowNull: true },      // ej. “-20%”, “Nuevo”
  position: { type: DataTypes.INTEGER, defaultValue: 0 },      // orden en la sección
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },   // visible en el home

  // Auditoría opcional
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  timestamps: true,
});
// models/Store.js


export const Catalog = sequelize.define("ERP_catalog", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  productId: { type: DataTypes.INTEGER, allowNull: false },

section: {
  type: DataTypes.ENUM(
    "home",           // sección principal de portada
    "ofertas",         // ofertas y promociones activas
    "recomendados",    // recomendados por el sistema o el panadero 😄
    "bajo_pedido",    // productos hechos solo bajo pedido
    "novedades",      // nuevos productos o lanzamientos
    "descuentos",     // artículos con rebaja temporal
    "populares",      // más vendidos o con mejores valoraciones
    "temporada",      // productos de temporada (Navidad, Día del Padre, etc.)
    "especiales",     // combinaciones, cajas o paquetes únicos
    "limitados"       // productos con stock limitado o edición especial
  ),
  allowNull: false,
  defaultValue: "home",
},


  // Personalización visual de la tarjeta del producto
  title: { type: DataTypes.STRING(150), allowNull: true },
  subtitle: { type: DataTypes.STRING(250), allowNull: true },
  imageUrl: { type: DataTypes.STRING(500), allowNull: true },
  badge: { type: DataTypes.STRING(50), allowNull: true },

  // Orden y visibilidad
  position: { type: DataTypes.INTEGER, defaultValue: 0 },
  minOrderQty: { type: DataTypes.INTEGER, allowNull: true },

  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },

  priceOverride: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  wholesaleOverrideRules: { type: DataTypes.JSON, allowNull: true },

  // Control temporal y sucursal (opcional)
  storeId: { type: DataTypes.INTEGER, allowNull: true },
  startsAt: { type: DataTypes.DATE, allowNull: true },
  endsAt: { type: DataTypes.DATE, allowNull: true },
}, {
  timestamps: true,
  indexes: [
    { fields: ["section", "isActive"] },
    { fields: ["position"] },
    { fields: ["productId"] },
    { unique: true, fields: ["productId", "section", "storeId"] },
  ],
});

export const Store = sequelize.define(
  "ERP_stores",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Datos visibles en la vitrina
    name: { type: DataTypes.STRING(120), allowNull: false },       // Ej: "Sucursal Centro"
    address: { type: DataTypes.STRING(250), allowNull: false },    // Dirección corta/mostrable
    description: { type: DataTypes.TEXT, allowNull: true },        // (opcional) texto ampliado
    imageUrl: { type: DataTypes.STRING(500), allowNull: true },    // Imagen de portada (StoresPanel usa este campo)

    // Contacto (opcional)
    phone: { type: DataTypes.STRING(40), allowNull: true },        // Ej: "+593 99 999 9999"
    email: { type: DataTypes.STRING(120), allowNull: true },

    // Ubicación (opcional, útil si luego quieres mapa)
    city: { type: DataTypes.STRING(100), allowNull: true },
    province: { type: DataTypes.STRING(100), allowNull: true },
    latitude: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null },
    longitude: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null },

    // Meta UI / ordenamiento y visibilidad
    position: { type: DataTypes.INTEGER, defaultValue: 0 },        // orden en lista
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },     // visible en home/lista

    // Auditoría
    createdBy: { type: DataTypes.INTEGER, allowNull: true },       // FK -> Account.id
  },
  {
    timestamps: true, // createdAt, updatedAt
    indexes: [
      { fields: ["isActive"] },
      { fields: ["position"] },
      { fields: ["city"] },
      { fields: ["province"] },
    ],
  }
);

// Tabla principal de productos o insumos


export const StoreProduct = sequelize.define("ERP_store_products", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  storeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'ERP_stores', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'ERP_inventory_products', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ["storeId", "productId"] },
    { fields: ["isActive"] },
  ],
});


Store.belongsToMany(InventoryProduct, {
  through: StoreProduct,
  foreignKey: 'storeId',
  otherKey: 'productId',
});

InventoryProduct.belongsToMany(Store, {
  through: StoreProduct,
  foreignKey: 'productId',
  otherKey: 'storeId',
});

// StoreProduct ↔ InventoryProduct
StoreProduct.belongsTo(InventoryProduct, { foreignKey: 'productId' });
InventoryProduct.hasMany(StoreProduct, { foreignKey: 'productId' });

// InventoryProduct ↔ Category / Unit
InventoryProduct.belongsTo(InventoryCategory, { foreignKey: 'categoryId' });
InventoryProduct.belongsTo(InventoryUnit, { foreignKey: 'unitId' });




// Asociaciones
Catalog.belongsTo(InventoryProduct, { foreignKey: "productId", as: "product" });
InventoryProduct.hasMany(Catalog, { foreignKey: "productId", as: "catalogEntries" });



// === Asociaciones ===
Store.belongsTo(Account, { foreignKey: "createdBy" });
// (Si luego quieres relación con pedidos o inventario, aquí añades más asociaciones)

// === Asociaciones ===
HomeProduct.belongsTo(InventoryProduct, {
  foreignKey: "productId",
  as: "product",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
InventoryProduct.hasMany(HomeProduct, {
  foreignKey: "productId",
  as: "homeEntries",
});


InventoryCategory.hasMany(InventoryProduct, {
  foreignKey: "categoryId",
  onDelete: "SET NULL"
});
InventoryProduct.belongsTo(InventoryCategory, {
  foreignKey: "categoryId"
});


// Relación para producto final → receta
InventoryProduct.hasMany(InventoryRecipe, { foreignKey: 'productFinalId', as: 'recipe' });
InventoryRecipe.belongsTo(InventoryProduct, { foreignKey: 'productFinalId', as: 'finalProduct' });

// Relación para insumo en receta
InventoryProduct.hasMany(InventoryRecipe, { foreignKey: 'productRawId', as: 'usedInRecipes' });
InventoryRecipe.belongsTo(InventoryProduct, { foreignKey: 'productRawId', as: 'rawProduct' });

InventoryProduct.hasMany(InventoryMovement, { foreignKey: 'productId', onDelete: 'CASCADE' });
InventoryMovement.belongsTo(InventoryProduct, { foreignKey: 'productId' });
InventoryUnit.hasMany(InventoryProduct, { foreignKey: 'unitId' });
InventoryProduct.belongsTo(InventoryUnit, { foreignKey: 'unitId' });

InventoryMovement.belongsTo(Account, { foreignKey: "createdBy" });




