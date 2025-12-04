import { sequelize } from "../database/connection.js";
import { DataTypes } from "sequelize";
import { Users } from "./Users.js";

// -- Formacion Academica
export const Matriz = sequelize.define(
  "alumni_matrices",
  {
    idMatriz: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idUser: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    idCareer: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    idPeriod: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    grateDate: {
      type: DataTypes.STRING(100),
      defaultValue: null,
    },
    modality: {
      type: DataTypes.STRING(100),
      defaultValue: null,
    },
  },
  {
    timestamps: false,
  },
);
export const Careers = sequelize.define(
  "alumni_careers",
  {
    idCareer: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      defaultValue: null,
    },
  },
  {
    timestamps: false,
  },
);
export const Periods = sequelize.define(
  "alumni_periods",
  {
    idPeriod: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      defaultValue: null,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
  },
  {
    timestamps: false,
  },
);
export const Matricula = sequelize.define(
  "alumni_matricula",
  {
    idMatricula: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idUser: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    especialidad: {
      type: DataTypes.STRING(400),
      defaultValue: null,
    },
    periodoAcademico: {
      type: DataTypes.STRING(400),
      defaultValue: null,
    },
    periodoActivo: {
      type: DataTypes.STRING(100),
      defaultValue: null,
    },
    retirado: {
      type: DataTypes.STRING(20),
      defaultValue: null,
    },
  },
  {
    timestamps: false,
  },
);

Users.hasMany(Matriz, {
  foreignKey: "idUser",
  sourceKey: "id",
  onDelete: "CASCADE",
});
Matriz.belongsTo(Users, {
  foreignKey: "idUser",
  sourceKey: "idUser",
});


Careers.hasMany(Matriz, {
  foreignKey: "idCareer",
  sourceKey: "idCareer",
  onDelete: "CASCADE",
});
Matriz.belongsTo(Careers, { foreignKey: "idCareer", sourceKey: "idCareer" });


Periods.hasMany(Matriz, {
  foreignKey: "idPeriod",
  sourceKey: "idPeriod",
  onDelete: "CASCADE",
});
Matriz.belongsTo(Periods, { foreignKey: "idPeriod", sourceKey: "idPeriod" });


Users.hasMany(Matricula, {
  foreignKey: "idUser",
  sourceKey: "id",
  onDelete: "CASCADE",
});
Matricula.belongsTo(Users, {
  foreignKey: "idUser",
  targetKey: "id",
});
