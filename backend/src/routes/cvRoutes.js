import { Router } from "express";
import {
  getProfessional,
  updateProfessional,
  getFullCv,
  getTemplates,
  saveTemplates,
  addAcademicTraining,
  editAcademicTraining,
  deleteAcademicTraining,
  getAllAcademicTraining,
  addTeachingExperience,
  editTeachingExperience,
  deleteTeachingExperience,
  getAllTeachingExperience,
  addCoursesWorkshops,
  editCoursesWorkshops,
  deleteCoursesWorkshops,
  getAllCoursesWorkshops,
  addIntellectualProduction,
  editIntellectualProduction,
  deleteIntellectualProduction,
  getAllIntellectualProduction,
  addBooks,
  editBooks,
  deleteBooks,
  getAllBooks,
  addAcademicProfessionalMerits,
  editAcademicProfessionalMerits,
  deleteAcademicProfessionalMerits,
  getAllAcademicProfessionalMerits,
  addLanguages,
  editLanguages,
  deleteLanguages,
  getAllLanguages,
  addProfessionalExperience,
  editProfessionalExperience,
  deleteProfessionalExperience,
  getAllProfessionalExperience,
} from "../controllers/cvController.js";
import { isAuthenticated } from "../middlewares/authMiddelware.js";
import { uploadCvPhoto, deleteCvPhoto } from "../middlewares/uploadCvPhotoMiddleware.js";

const router = Router();

router.use(isAuthenticated);

// Perfil CV (incluye foto hoja de vida y datos editables)
router.get("/professional", getProfessional);
router.put("/professional", updateProfessional);
router.put("/professional/photo", uploadCvPhoto);
router.delete("/professional/photo", deleteCvPhoto);
router.get("/full", getFullCv);
router.get("/templates", getTemplates);
router.post("/templates", saveTemplates);

// Formación académica
router.get("/academic-training", getAllAcademicTraining);
router.post("/academic-training", addAcademicTraining);
router.put("/academic-training/:academicId", editAcademicTraining);
router.delete("/academic-training/:academicId", deleteAcademicTraining);

// Experiencia docente
router.get("/teaching-experience", getAllTeachingExperience);
router.post("/teaching-experience", addTeachingExperience);
router.put("/teaching-experience/:teachingId", editTeachingExperience);
router.delete("/teaching-experience/:teachingId", deleteTeachingExperience);

// Cursos / talleres
router.get("/courses-workshops", getAllCoursesWorkshops);
router.post("/courses-workshops", addCoursesWorkshops);
router.put("/courses-workshops/:courseId", editCoursesWorkshops);
router.delete("/courses-workshops/:courseId", deleteCoursesWorkshops);

// Producción intelectual
router.get("/intellectual-production", getAllIntellectualProduction);
router.post("/intellectual-production", addIntellectualProduction);
router.put("/intellectual-production/:intellectualId", editIntellectualProduction);
router.delete("/intellectual-production/:intellectualId", deleteIntellectualProduction);

// Libros
router.get("/books", getAllBooks);
router.post("/books", addBooks);
router.put("/books/:bookId", editBooks);
router.delete("/books/:bookId", deleteBooks);

// Méritos académicos y profesionales
router.get("/merits", getAllAcademicProfessionalMerits);
router.post("/merits", addAcademicProfessionalMerits);
router.put("/merits/:meritId", editAcademicProfessionalMerits);
router.delete("/merits/:meritId", deleteAcademicProfessionalMerits);

// Idiomas
router.get("/languages", getAllLanguages);
router.post("/languages", addLanguages);
router.put("/languages/:languageId", editLanguages);
router.delete("/languages/:languageId", deleteLanguages);

// Experiencia profesional
router.get("/professional-experience", getAllProfessionalExperience);
router.post("/professional-experience", addProfessionalExperience);
router.put("/professional-experience/:experienceId", editProfessionalExperience);
router.delete("/professional-experience/:experienceId", deleteProfessionalExperience);

export default router;
