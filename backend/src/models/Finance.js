// models/Finance.js
import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

import { Account } from "./Account.js";
import { InventoryProduct } from "./Inventory.js";

// ✅ Ajusta a tu proyecto real:
import { OrderItem } from "./Orders.js"; // <-- AJUSTA

// =====================================================
// 1) GRUPO de ítems (deuda agrupada)
// =====================================================
export const ItemGroup = sequelize.define("ERP_finance_item_groups", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Cliente dueño del grupo",
  },

  concept: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Grupo de pago",
    comment: "Nombre/nota del grupo",
  },

  status: {
    type: DataTypes.ENUM("open", "closed", "cancelled"),
    allowNull: false,
    defaultValue: "open",
    comment: "Estado del grupo",
  },

  // (opcional pero útil para mostrar “foto” del total al crear)
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: "Total del grupo al momento de crearlo (snapshot)",
  },

  createdBy: { type: DataTypes.INTEGER, allowNull: false },
});

// Puente grupo <-> item
export const ItemGroupItem = sequelize.define("ERP_finance_item_group_items", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  groupId: { type: DataTypes.INTEGER, allowNull: false },
  orderItemId: { type: DataTypes.INTEGER, allowNull: false },
});

// =====================================================
// 2) PAYMENT (Abono al grupo / dinero que entra)
// ✅ Cada abono crea 1 Income
// referenceType: "group_payment"
// referenceId: payment.id
// =====================================================
export const Payment = sequelize.define("ERP_finance_payments", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Cliente que realiza el pago/abono",
  },

  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Grupo al que se aplica el abono",
  },

  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: "Fecha del pago/abono",
  },

  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Monto del abono",
  },

  method: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "efectivo",
    comment: "Forma de pago",
  },

  note: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Observación opcional",
  },

  status: {
    type: DataTypes.ENUM("completed", "cancelled"),
    allowNull: false,
    defaultValue: "completed",
    comment: "Estado del pago/abono",
  },

  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Usuario que registró el pago",
  },
});

// =====================================================
// 3) INCOME (Contabilidad)
// ✅ Regla: 1 Payment = 1 Income
// referenceType = "group_payment"
// referenceId   = payment.id
// =====================================================
export const Income = sequelize.define("ERP_finance_incomes", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

  concept: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },

  referenceId: { type: DataTypes.INTEGER, allowNull: true },
  referenceType: { type: DataTypes.STRING, allowNull: true },

  status: {
    type: DataTypes.ENUM("pending", "paid"),
    allowNull: false,
    defaultValue: "paid",
  },

  counterpartyName: { type: DataTypes.STRING, allowNull: true },

  createdBy: { type: DataTypes.INTEGER, allowNull: false },
});

// =====================================================
// 4) EXPENSE
// =====================================================
export const Expense = sequelize.define("ERP_finance_expenses", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

  concept: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },

  referenceId: { type: DataTypes.INTEGER, allowNull: true },
  referenceType: { type: DataTypes.STRING, allowNull: true },

  status: {
    type: DataTypes.ENUM("pending", "paid"),
    allowNull: false,
    defaultValue: "paid",
  },

  counterpartyName: { type: DataTypes.STRING, allowNull: true },

  createdBy: { type: DataTypes.INTEGER, allowNull: false },
});

// =====================================================
// 5) RELACIONES
// =====================================================

// Income/Expense -> Account
Income.belongsTo(Account, { foreignKey: "createdBy" });
Expense.belongsTo(Account, { foreignKey: "createdBy" });

// Expense -> InventoryProduct (si referenceId apunta a producto)
InventoryProduct.hasMany(Expense, { foreignKey: "referenceId" });
Expense.belongsTo(InventoryProduct, { foreignKey: "referenceId" });

// Grupo -> Account
ItemGroup.belongsTo(Account, { foreignKey: "createdBy" });

// Grupo -> Items
ItemGroup.hasMany(ItemGroupItem, { foreignKey: "groupId", onDelete: "CASCADE" });
ItemGroupItem.belongsTo(ItemGroup, { foreignKey: "groupId" });

// ✅ Regla: un item solo puede pertenecer a 1 grupo
OrderItem.hasOne(ItemGroupItem, { foreignKey: "orderItemId" });
ItemGroupItem.belongsTo(OrderItem, { foreignKey: "orderItemId" });

// Payment -> Account
Payment.belongsTo(Account, { foreignKey: "createdBy" });

// Payment -> Group
Payment.belongsTo(ItemGroup, { foreignKey: "groupId" });
ItemGroup.hasMany(Payment, { foreignKey: "groupId" });

/*
  ✅ RECOMENDACIONES (migrations):
  1) Evitar duplicar Income por Payment:
     UNIQUE(referenceType, referenceId) en ERP_finance_incomes

  2) Evitar que un item esté en 2 grupos:
     UNIQUE(orderItemId) en ERP_finance_item_group_items

  3) (Opcional) Evitar 2 pagos “idénticos” por error humano:
     index(groupId, date, amount)
*/
