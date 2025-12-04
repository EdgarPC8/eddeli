import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";
import { Users } from "./Users.js";


// ----------------------------------------------------------------------------------------------------------------------------------
// Quiz
const QuizQuizzes = sequelize.define("quiz_quizzes", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.TEXT },
  description: { type: DataTypes.TEXT },
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
  date: { type: DataTypes.DATE },
  maxAttempts: { type: DataTypes.INTEGER, defaultValue: 1 }, 
});

// Pregunta
const QuizQuestions = sequelize.define("quiz_questions", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quizId: { type: DataTypes.INTEGER },
  text: { type: DataTypes.TEXT },
  type: {
    type: DataTypes.ENUM("single", "multiple", "open"),
    defaultValue: "single",
  },
  isRequired: { type: DataTypes.BOOLEAN, defaultValue: true },
  order: { type: DataTypes.INTEGER },
});

// Opciones
const QuizOptions = sequelize.define("quiz_options", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  questionId: { type: DataTypes.INTEGER },
  text: { type: DataTypes.STRING },
  isCorrect: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// Nuevo: Intento de resolución del quiz
const QuizAttempts = sequelize.define("quiz_attempts", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quizId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  attemptNumber: { type: DataTypes.INTEGER, allowNull: false },
  startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  completedAt: { type: DataTypes.DATE },
});

// Respuestas por pregunta (por intento)
const QuizAnswers = sequelize.define("quiz_answers", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  attemptId: { type: DataTypes.INTEGER, allowNull: false },
  questionId: { type: DataTypes.INTEGER, allowNull: false },
  selectedOptionIds: { type: DataTypes.JSON }, // array de opciones si es múltiple
  answerText: { type: DataTypes.TEXT }, // para preguntas abiertas
  isCorrect: { type: DataTypes.BOOLEAN }, // si aplica
});

const QuizAssignment = sequelize.define("quiz_quizzes_users", {
  quizId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  availableModes: {
    type: DataTypes.JSON,
    defaultValue: ["evaluation"]
  }
}, {
  timestamps: false
});


// -------------------------------------------------------------------------
// 1. Quiz tiene muchas preguntas
QuizQuizzes.hasMany(QuizQuestions, { foreignKey: "quizId", onDelete: "CASCADE", hooks: true });
QuizQuestions.belongsTo(QuizQuizzes, { foreignKey: "quizId" });

// 2. Pregunta tiene muchas opciones
QuizQuestions.hasMany(QuizOptions, { foreignKey: "questionId", onDelete: "CASCADE", hooks: true });
QuizOptions.belongsTo(QuizQuestions, { foreignKey: "questionId" });

// 3. Quiz tiene muchos intentos
QuizQuizzes.hasMany(QuizAttempts, { foreignKey: "quizId", onDelete: "CASCADE" });
QuizAttempts.belongsTo(QuizQuizzes, { foreignKey: "quizId" });

// 4. Usuario tiene muchos intentos
Users.hasMany(QuizAttempts, { foreignKey: "userId", onDelete: "CASCADE" });
QuizAttempts.belongsTo(Users, { foreignKey: "userId" });

// 5. Intento tiene muchas respuestas
QuizAttempts.hasMany(QuizAnswers, { foreignKey: "attemptId", onDelete: "CASCADE", hooks: true });
QuizAnswers.belongsTo(QuizAttempts, { foreignKey: "attemptId" });

// 6. Pregunta tiene muchas respuestas
QuizQuestions.hasMany(QuizAnswers, { foreignKey: "questionId", onDelete: "CASCADE", hooks: true });
QuizAnswers.belongsTo(QuizQuestions, { foreignKey: "questionId" });

QuizQuizzes.belongsToMany(Users, {
  through: QuizAssignment,
  foreignKey: 'quizId',
});
Users.belongsToMany(QuizQuizzes, {
  through: QuizAssignment,
  foreignKey: 'userId',
});

QuizAssignment.belongsTo(QuizQuizzes, { foreignKey: "quizId" });
QuizQuizzes.hasMany(QuizAssignment, { foreignKey: "quizId" });




// -------------------------------------------------------------------------


export {
  QuizQuizzes,
  QuizQuestions,
  QuizOptions,
  QuizAttempts,
  QuizAssignment,
  QuizAnswers };
