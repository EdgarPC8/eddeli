import { Router } from "express";
import {
  getQuizzes,
  createQuiz,
  editQuiz,
  deleteQuiz,
  getQuestionsByQuiz,
  addQuestionsToQuiz,
  getQuizResponses,
  getResponsesGroupedByUser,
  getUsersByQuizAssign,
deleteUsersByQuizAssign,
assignUsersToQuiz,
filterUsers,
getQuizzesByUserId,
submitQuizAnswers
} from "../controllers/QuizController.js";

import { isAuthenticated } from "../middlewares/authMiddelware.js";

const router = Router();

// Cuestionarios
router.get("/", isAuthenticated, getQuizzes);
router.post("/", isAuthenticated, createQuiz);
router.put("/:id", isAuthenticated, editQuiz);
router.delete("/:id", isAuthenticated, deleteQuiz);

// Preguntas de un cuestionario
router.get("/questions/:id", isAuthenticated, getQuestionsByQuiz);
router.put("/questions/:id", isAuthenticated, addQuestionsToQuiz);

// Respuestas de un cuestionario (estadísticas)
router.get("/responses/:id", isAuthenticated, getQuizResponses);
router.get("/responses/users/:quizId", getResponsesGroupedByUser);


router.get("/assign/:quizId", getUsersByQuizAssign);
router.delete("/assign/:quizId/:userId", deleteUsersByQuizAssign);
router.post("/assign/filter", filterUsers);   
router.post("/assign/:quizId", assignUsersToQuiz);       // Para asignar usuarios

router.get("/assigned/:userId", getQuizzesByUserId);

router.post("/submit/:quizId", isAuthenticated, submitQuizAnswers);





export default router;
