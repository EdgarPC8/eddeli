import { sequelize } from "../database/connection.js";
import { DataTypes } from "sequelize";

/**
 * Plantillas de CV para el manejador (nombre, descripción, tipo, secciones).
 * componentKey indica qué componente usar en el frontend (completa, resumida, etc.).
 */
export const CvTemplate = sequelize.define(
  "cv_templates",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    type: {
      type: DataTypes.STRING(40),
      defaultValue: "Completa",
    },
    sections: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    componentKey: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "completa",
    },
  },
  { timestamps: false }
);
