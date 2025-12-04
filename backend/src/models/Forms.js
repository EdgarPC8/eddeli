// models/FormModule.js
import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";
import { Users } from "./Users.js";

const Form = sequelize.define("form_forms", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },

  // Encuesta pública o privada
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
  date: { type: DataTypes.DATE },
});


// Pregunta
const Question = sequelize.define("form_questions", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  formId: { type: DataTypes.INTEGER },
  text: { type: DataTypes.TEXT },
  type: { type: DataTypes.STRING }, // 'short_answer', 'paragraph', etc.
  required: { type: DataTypes.BOOLEAN },
  order: { type: DataTypes.INTEGER,allowNull: false, },
  createdAt: { type: DataTypes.DATE },
  updatedAt: { type: DataTypes.DATE },
});

// Opción
const Option = sequelize.define("form_options", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  questionId: { type: DataTypes.INTEGER },
  text: { type: DataTypes.STRING },
  isCorrect: { type: DataTypes.BOOLEAN }, // opcional si es tipo quiz
  order: { type: DataTypes.INTEGER },
});

// Respuesta completa de un usuario
const Response = sequelize.define("form_responses", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  formId: { type: DataTypes.INTEGER },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  
});

// Respuesta a una pregunta individual
const Answer = sequelize.define("form_answers", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  responseId: { type: DataTypes.INTEGER },
  questionId: { type: DataTypes.INTEGER },
  answerText: { type: DataTypes.TEXT },
  selectedOptionIds: { type: DataTypes.JSON }, // para múltiples opciones
});

const UserForm = sequelize.define("form_usersForms", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  formId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  assignedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, // opcional
});


// models/Form.js
Form.belongsToMany(Users, {
  through: UserForm,
  foreignKey: "formId",
  otherKey: "userId",
});
// models/Users.js
Users.belongsToMany(Form, {
  through: UserForm,
  foreignKey: "userId",
  otherKey: "formId",
});


// Un formulario tiene muchas preguntas
Form.hasMany(Question, {
  foreignKey: "formId",
  onDelete: "CASCADE",
  hooks: true,
});
Question.belongsTo(Form, { foreignKey: "formId" });

// Una pregunta tiene muchas opciones
Question.hasMany(Option, {
  foreignKey: "questionId",
  onDelete: "CASCADE",
  hooks: true,
});
Option.belongsTo(Question, { foreignKey: "questionId" });

// Un formulario tiene muchas respuestas
Form.hasMany(Response, {
  foreignKey: "formId",
  onDelete: "CASCADE",
  hooks: true,
});
Response.belongsTo(Form, { foreignKey: "formId" });

// Una respuesta pertenece a un usuario
Users.hasMany(Response, {
  foreignKey: "userId",
  onDelete: "SET NULL", // o "CASCADE" según lo que prefieras
});
Response.belongsTo(Users, { foreignKey: "userId" });

// Una respuesta global tiene muchas respuestas a preguntas
Response.hasMany(Answer, {
  foreignKey: "responseId",
  onDelete: "CASCADE",
  hooks: true,
});
Answer.belongsTo(Response, { foreignKey: "responseId" });

// Una respuesta está asociada a una pregunta
Question.hasMany(Answer, {
  foreignKey: "questionId",
  onDelete: "CASCADE",
  hooks: true,
});
Answer.belongsTo(Question, { foreignKey: "questionId" });


export {
  Form,
  Question,
  Option,
  Response,
  Answer,
  UserForm
};
