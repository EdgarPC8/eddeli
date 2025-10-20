// models/Finance.js
import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";
import { Account } from "./Account.js";



export const Income = sequelize.define("ERP_finance_incomes", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  concept: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  referenceId: { type: DataTypes.INTEGER, allowNull: true },
  referenceType: { type: DataTypes.STRING, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: false }
});

export const Expense = sequelize.define("ERP_finance_expenses", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  concept: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  referenceId: { type: DataTypes.INTEGER, allowNull: true },
  referenceType: { type: DataTypes.STRING, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: false }
});

Income.belongsTo(Account, { foreignKey: "createdBy" });
Expense.belongsTo(Account, { foreignKey: "createdBy" });
