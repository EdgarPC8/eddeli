import { DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../database/connection.js';
import { InventoryProduct } from './Inventory.js';

// Tabla de clientes
export const Customer = sequelize.define("ERP_customers", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
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

// Relaciones
Customer.hasMany(Order, { foreignKey: 'customerId' });
Order.belongsTo(Customer, { foreignKey: 'customerId' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

InventoryProduct.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(InventoryProduct, { foreignKey: 'productId' });
