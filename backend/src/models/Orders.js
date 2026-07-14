import { DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../database/connection.js';
import { InventoryProduct } from './Inventory.js';
import { CashShift } from './CashShift.js';

// Tabla de clientes
export const Customer = sequelize.define("ERP_customers", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  /** Nombre completo (denormalizado para listados / pedidos). */
  name: { type: DataTypes.STRING, allowNull: false },
  firstName: { type: DataTypes.STRING(120), allowNull: true },
  secondName: { type: DataTypes.STRING(120), allowNull: true },
  firstLastName: { type: DataTypes.STRING(120), allowNull: true },
  secondLastName: { type: DataTypes.STRING(120), allowNull: true },
  /**
   * Tipo identificación SRI: 04 RUC, 05 cédula, 06 pasaporte,
   * 07 consumidor final, 08 id. exterior.
   */
  identType: {
    type: DataTypes.STRING(2),
    allowNull: true,
    defaultValue: "05",
  },
  /** Número de documento (cédula / RUC / pasaporte). */
  cedula: { type: DataTypes.STRING(32), allowNull: true },
  phone: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
}, {
  timestamps: true,
});

// Tabla de pedidos (cabecera)
export const Order = sequelize.define("ERP_orders", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customerId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM("pendiente", "entregado", "pagado"),
    defaultValue: "pendiente"
  },
  notes: { type: DataTypes.TEXT },
  shiftId: { type: DataTypes.INTEGER, allowNull: true },
  paymentMethod: { type: DataTypes.STRING(40), allowNull: true },
  paidAt: { type: DataTypes.DATE, allowNull: true },
  documentType: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: "factura | nota_venta | documento | consumidor_final",
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW
  },
  financeIncomeId: { type: DataTypes.INTEGER, allowNull: true }

  
}, {
  timestamps: true,
});

// Tabla de detalles del pedido (productos)
export const OrderItem = sequelize.define("ERP_order_items", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  soldQty: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: "Cantidad realmente vendida (cobrable)"
  },
  
  damagedQty: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: "Cantidad dañada / merma"
  },
  
  giftQty: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: "Cantidad entregada como yapa"
  },
  
  replacedQty: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: "Cantidad entregada como reemplazo"
  },
  
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true, // null means not delivered yet
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Fecha cuando quedó totalmente pagado (último pago)",
  },
  
  
}, {
  timestamps: false,
});

// Proveedores
export const Supplier = sequelize.define("ERP_suppliers", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  phone: { type: DataTypes.STRING(40), allowNull: true },
  email: { type: DataTypes.STRING(120), allowNull: true },
  address: { type: DataTypes.STRING(250), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  timestamps: true,
});

// Pedidos a proveedor (compras planificadas)
export const SupplierOrder = sequelize.define("ERP_supplier_orders", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  supplierId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM("pendiente", "recibido", "cancelado"),
    allowNull: false,
    defaultValue: "pendiente",
  },
  receivedAt: { type: DataTypes.DATE, allowNull: true },
  paidAt: { type: DataTypes.DATE, allowNull: true },
  paymentMethod: { type: DataTypes.STRING(40), allowNull: true },
  financeExpenseId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  timestamps: true,
});

export const SupplierOrderItem = sequelize.define("ERP_supplier_order_items", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(10, 3), allowNull: false, defaultValue: 0 },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "% IVA aplicado al ítem (0 = sin IVA)",
  },
}, {
  timestamps: false,
});

// Relaciones
Customer.hasMany(Order, { foreignKey: "customerId", as: "ERP_orders" });
Order.belongsTo(Customer, { foreignKey: "customerId", as: "ERP_customer" });

Order.hasMany(OrderItem, { foreignKey: "orderId", onDelete: "CASCADE", as: "ERP_order_items" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "ERP_order" });

InventoryProduct.hasMany(OrderItem, { foreignKey: "productId" });
OrderItem.belongsTo(InventoryProduct, { foreignKey: "productId", as: "ERP_inventory_product" });

CashShift.hasMany(Order, { foreignKey: 'shiftId', as: 'orders' });
Order.belongsTo(CashShift, { foreignKey: 'shiftId', as: 'shift' });

Supplier.hasMany(SupplierOrder, { foreignKey: 'supplierId', onDelete: 'RESTRICT' });
SupplierOrder.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'ERP_supplier' });

SupplierOrder.hasMany(SupplierOrderItem, {
  foreignKey: 'orderId',
  as: 'ERP_supplier_order_items',
  onDelete: 'CASCADE',
});
SupplierOrderItem.belongsTo(SupplierOrder, { foreignKey: 'orderId' });

InventoryProduct.hasMany(SupplierOrderItem, { foreignKey: 'productId' });
SupplierOrderItem.belongsTo(InventoryProduct, {
  foreignKey: 'productId',
  as: 'ERP_inventory_product',
});
