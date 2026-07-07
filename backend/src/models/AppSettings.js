import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

/** Configuración global de la instalación (una fila, id=1). */
export const AppSettings = sequelize.define(
  "app_settings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    name: { type: DataTypes.STRING(255), allowNull: false },
    alias: { type: DataTypes.STRING(80), allowNull: false },
    version: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "1.0.0" },
    description: { type: DataTypes.TEXT, allowNull: true },
    author: { type: DataTypes.STRING(120), allowNull: true },
    logoPath: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(40), allowNull: true },
    socialWhatsapp: { type: DataTypes.STRING(255), allowNull: true },
    socialFacebook: { type: DataTypes.STRING(255), allowNull: true },
    socialInstagram: { type: DataTypes.STRING(255), allowNull: true },
    socialTiktok: { type: DataTypes.STRING(255), allowNull: true },
    socialEmail: { type: DataTypes.STRING(120), allowNull: true },
    /** Prefijo de carpetas en src/img (ej. EdDeli, MiNegocio). */
    mediaFolderPrefix: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "app" },
    /** Subcadena para filtrar categoría en accesos rápidos de caja (ej. panader). */
    cajaQuickCategoryMatch: { type: DataTypes.STRING(80), allowNull: true },
    walkInCustomerLabel: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "Consumidor Final",
    },
  },
  { timestamps: true },
);
