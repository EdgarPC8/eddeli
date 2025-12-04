// controllers/quizController.js
import {
  QuizQuizzes,
  QuizQuestions,
  QuizOptions,
  QuizAnswers,
  QuizAttempts,
  QuizAssignment
} from "../models/Quiz.js";
import { Users } from "../models/Users.js";

import { Account, AccountRoles } from "../models/Account.js";
import { Roles } from "../models/Roles.js";
import { sequelize } from "../database/connection.js";

export const assignUsersToQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { userIds, availableModes = ["evaluation"] } = req.body;

  if (!Array.isArray(userIds)) {
    return res.status(400).json({ message: "userIds debe ser un array." });
  }

  try {
    const assignments = userIds.map(userId => ({
      quizId,
      userId,
      availableModes
    }));

    await QuizAssignment.bulkCreate(assignments, {
      ignoreDuplicates: true,
    });

    res.status(201).json({ message: "Usuarios asignados con modos correctamente." });
  } catch (error) {
    console.error("Error al asignar usuarios:", error);
    res.status(500).json({ message: "Error al asignar usuarios al cuestionario." });
  }
};

export const submitQuizAnswers = async (req, res) => {
  const { quizId } = req.params;
  const { userId, answers } = req.body;

  try {
    const quiz = await QuizQuizzes.findByPk(quizId);
    if (!quiz) return res.status(404).json({ message: "Cuestionario no encontrado" });

    const previousAttempts = await QuizAttempts.count({ where: { quizId, userId } });
    if (previousAttempts >= quiz.maxAttempts) {
      return res.status(403).json({
        message: `Has alcanzado el máximo de intentos permitidos (${quiz.maxAttempts})`,
      });
    }

    const newAttempt = await QuizAttempts.create({
      quizId,
      userId,
      attemptNumber: previousAttempts + 1,
    });

    const bulkAnswers = answers.map((a) => ({
      attemptId: newAttempt.id,
      questionId: a.questionId,
      selectedOptionIds: a.selectedOptionIds || [],
      answerText: a.answerText || null,
    }));

    // Agrega validación de respuestas correctas si hay opciones
    for (let answer of bulkAnswers) {
      if (answer.selectedOptionIds.length > 0) {
        const correctOptions = await QuizOptions.findAll({
          where: {
            questionId: answer.questionId,
            isCorrect: true,
          },
        });

        const correctIds = correctOptions.map((opt) => opt.id).sort();
        const selectedIds = [...answer.selectedOptionIds].sort();

        answer.isCorrect =
          correctIds.length === selectedIds.length &&
          correctIds.every((val, i) => val === selectedIds[i]);
      } else {
        answer.isCorrect = null;
      }
    }

    await QuizAnswers.bulkCreate(bulkAnswers);

    res.status(201).json({ message: "Intento y respuestas registrados con éxito." });
  } catch (error) {
    console.error("❌ Error al guardar respuestas:", error);
    res.status(500).json({ message: "Error al guardar respuestas del quiz" });
  }
};
export const getQuizzes = async (req, res) => {
  try {
    const quizzes = await QuizQuizzes.findAll();
    res.json(quizzes);
  } catch (error) {
    console.error("Error al obtener cuestionarios:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const createQuiz = async (req, res) => {
  const { title, description, date, isPublic, maxAttempts } = req.body;

  try {
    const newQuiz = await QuizQuizzes.create({ title, description, date, isPublic, maxAttempts });

    res.status(201).json({ message: "Cuestionario creado correctamente.", quiz: newQuiz });
  } catch (error) {
    console.error("Error al crear el cuestionario:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const editQuiz = async (req, res) => {
  const { id } = req.params;
  const { title, description, date, isPublic, maxAttempts } = req.body;

  try {
    const quiz = await QuizQuizzes.findByPk(id);
    if (!quiz) return res.status(404).json({ message: "Cuestionario no encontrado" });
    await quiz.update({ title, description, date, isPublic,maxAttempts });
    res.json({ message: "Cuestionario actualizado correctamente." });
  } catch (error) {
    console.error("Error al editar cuestionario:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const deleteQuiz = async (req, res) => {
  const { id } = req.params;
  try {
    const quiz = await QuizQuizzes.findByPk(id);
    if (!quiz) return res.status(404).json({ message: "Cuestionario no encontrado" });
    await quiz.destroy();
    res.json({ message: "Cuestionario eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar el cuestionario:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const getQuestionsByQuiz = async (req, res) => {
  const { id } = req.params;
  try {
    const quiz = await QuizQuizzes.findByPk(id, {
      attributes: ["id", "title", "description", "date"],
      include: [
        {
          model: QuizQuestions,
          attributes: ["id", "text", "type", "order", "isRequired"],
          include: [
            {
              model: QuizOptions,
              attributes: ["id", "text", "isCorrect"]
            }
          ]
        }
      ]
    });

    if (!quiz) return res.status(404).json({ message: "Cuestionario no encontrado." });

    // const formattedQuestions = quiz.quiz_questions?.sort((a, b) => a.order - b.order).map((q) => ({
      const formattedQuestions = quiz.quiz_questions
  ?.sort(() => Math.random() - 0.5)
  .map((q) => ({

      id: q.id,
      text: q.text,
      type: q.type,
      isRequired: q.isRequired,
      order: q.order,
      options: q.quiz_options?.map((opt) => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect
      })) || []
    })) || [];

    

    res.status(200).json({
      form: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        date: quiz.date
      },
      questions: formattedQuestions
    });
  } catch (error) {
    console.error("Error al obtener el cuestionario:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const addQuestionsToQuiz = async (req, res) => {
  const { id: quizId } = req.params;
  const questions = req.body;

  try {
    // Obtener preguntas existentes
    const existingQuestions = await QuizQuestions.findAll({ where: { quizId } });
    const incomingIds = new Set(questions.map((q) => q.id).filter(Boolean));

    // Eliminar preguntas que ya no están
    for (const existing of existingQuestions) {
      if (!incomingIds.has(existing.id)) {
        await QuizOptions.destroy({ where: { questionId: existing.id } });
        await existing.destroy();
      }
    }

    // Procesar cada pregunta entrante
    for (const q of questions) {
      if (q.id) {
        // Actualizar pregunta existente
        const existing = await QuizQuestions.findByPk(q.id);
        if (existing) {
          await existing.update({
            text: q.question,
            type: q.type,
            isRequired: q.isRequired,
            order: q.order,
          });
          await QuizOptions.destroy({ where: { questionId: existing.id } });
          if (q.options && q.options.length > 0) {
            await QuizOptions.bulkCreate(
              q.options.map((opt) => ({
                questionId: existing.id,
                text: opt.text,
                isCorrect: opt.isCorrect,
              }))
            );
          }
        }
      } else {
        // Crear nueva pregunta
        const newQuestion = await QuizQuestions.create({
          quizId,
          text: q.question,
          type: q.type,
          isRequired: q.isRequired ?? true,
          order: q.order ?? 0,
        });

        if (q.options && q.options.length > 0) {
          await QuizOptions.bulkCreate(
            q.options.map((opt) => ({
              questionId: newQuestion.id,
              text: opt.text,
              isCorrect: opt.isCorrect,
            }))
          );
        }
      }
    }

    res.status(200).json({ message: "Preguntas del cuestionario guardadas correctamente." });
  } catch (error) {
    console.error("❌ Error al guardar preguntas:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const getQuizResponses = async (req, res) => {
  const { id: quizId } = req.params;

  try {
    const attempts = await QuizAttempts.findAll({
      where: { quizId },
      include: [
        {
          model: QuizAnswers,
          include: [
            {
              model: QuizQuestions,
              include: [QuizOptions]
            }
          ]
        }
      ]
    });

    const allResponses = attempts.flatMap((attempt) =>
      attempt.quiz_answers.map((answer) => ({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionIds: answer.selectedOptionIds,
        answerText: answer.answerText,
        isCorrect: answer.isCorrect,
        question: answer.quiz_question?.text,
        options: answer.quiz_question?.quiz_options
      }))
    );

    res.json(allResponses);
  } catch (error) {
    console.error("Error al obtener respuestas del cuestionario:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};
// GET /api/quiz/responses/users/:quizId
export const getResponsesGroupedByUser = async (req, res) => {
  const { quizId } = req.params;

  try {
    const attempts = await QuizAttempts.findAll({
      where: { quizId },
      include: [
        {
          model: QuizAnswers,
          attributes: ['questionId', 'isCorrect'],
        },
        {
          model: Users,
          attributes: ['id', 'firstName', 'firstLastName'], // agrega los campos que necesites
        },
      ],
      order: [['userId'], ['attemptNumber']],
    });

    const userMap = new Map();

    for (const attempt of attempts) {
      const user = attempt.user || {}; // Puede ser null si no hay relación

      const userId = attempt.userId;
      const entry = userMap.get(userId) || {
        userId,
        username: `${user.firstName} ${user.firstLastName}`,
        attempts: [],
      };

      entry.attempts.push({
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        answers: attempt.quiz_answers || [],
      });

      userMap.set(userId, entry);
    }

    res.json(Array.from(userMap.values()));
  } catch (error) {
    console.error("❌ Error al agrupar respuestas por usuario:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// GET /api/quiz/assign/:quizId
export const getUsersByQuizAssign = async (req, res) => {
  const { quizId } = req.params;

  try {
    const quiz = await QuizQuizzes.findByPk(quizId, {
      include: [
        {
          model: Users,
          attributes: ["id", "firstName", "secondName", "firstLastName", "secondLastName", "ci"],
          through: {
            attributes: ["availableModes"], // ✅ incluir los campos personalizados
          },
        },
      ],
    });

    if (!quiz) return res.status(404).json({ message: 'Cuestionario no encontrado' });

    // fusionar los datos para incluir availableModes al nivel superior
    const result = quiz.users.map((u) => ({
      ...u.toJSON(),
      availableModes: u.quiz_quizzes_users?.availableModes ?? [],
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error al obtener usuarios asignados:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};

// DELETE /api/quiz/assign/:quizId/:userId
export const deleteUsersByQuizAssign = async (req, res) => {
  const { quizId, userId } = req.params;

  try {
    const deleted = await sequelize.models.quiz_quizzes_users.destroy({
      where: { quizId, userId },
    });

    if (deleted === 0) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }

    res.status(200).json({ message: 'Usuario eliminado de la asignación correctamente.' });
  } catch (error) {
    console.error('Error al eliminar asignación:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};

export const filterUsers = async (req, res) => {
  const { roleId } = req.body;

  try {
    let accounts;
    if (roleId) {
      accounts = await Account.findAll({
        include: [
          {
            model: Roles,
            where: { id: roleId },
            through: { attributes: [] }
          },
          {
            model: Users,
            attributes: ["id", "firstName", "secondName", "firstLastName", "secondLastName", "ci"]
          }
        ]
      });
    } else {
      accounts = await Account.findAll({
        include: [
          {
            model: Roles,
            through: { attributes: [] }
          },
          {
            model: Users,
            attributes: ["id", "firstName", "secondName", "firstLastName", "secondLastName", "ci"]
          }
        ]
      });
    }

    // filtrar usuarios únicos
    const uniqueUsers = new Map();
    accounts.forEach(account => {
      if (account.user && !uniqueUsers.has(account.user.id)) {
        uniqueUsers.set(account.user.id, account.user);
      }
    });

    res.status(200).json(Array.from(uniqueUsers.values()));
  } catch (error) {
    console.error("Error al filtrar usuarios:", error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

export const getQuizzesByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Obtener las asignaciones del usuario
    const assignments = await QuizAssignment.findAll({
      where: { userId },
      include: [{ model: QuizQuizzes }],
    });

    // 2. Obtener intentos realizados por el usuario
    const attempts = await QuizAttempts.findAll({ where: { userId } });

    // 3. Contar intentos por cuestionario
    const attemptCounts = {};
    for (const attempt of attempts) {
      attemptCounts[attempt.quizId] = (attemptCounts[attempt.quizId] || 0) + 1;
    }

    // 4. Formatear resultados
    const formatted = assignments.map(a => {
      const quiz = a.quiz_quizz || a.quiz_quiz || a.quiz || a.QuizQuiz || a.QuizQuizz || a.QuizQuizzes || a.QuizQuizz; // Sequelize puede dar nombres variados si no hay alias
      if (!quiz) return null;

      const currentAttempts = attemptCounts[quiz.id] || 0;

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        date: quiz.date,
        maxAttempts: quiz.maxAttempts,
        currentAttempts,
        responded: currentAttempts > 0,
        availableModes: a.availableModes
      };
    }).filter(Boolean);

    res.status(200).json(formatted);
  } catch (error) {
    console.error("❌ Error al obtener quizzes del usuario:", error);
    res.status(500).json({ message: "Error al obtener quizzes asignados." });
  }
};










