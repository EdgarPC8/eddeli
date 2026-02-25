import {
  Professionals,
  AcademicTraining,
  TeachingExperience,
  CoursesWorkshops,
  IntellectualProduction,
  Books,
  AcademicProfessionalMerits,
  Languages,
  ProfessionalExperience,
} from "../models/CV.js";
import { Users } from "../models/Users.js";
import { UserData } from "../models/UserData.js";
import { CvTemplate } from "../models/CvTemplate.js";

async function getOrCreateProfessionalId(req) {
  const idUser = req.user?.userId;
  if (!idUser) throw new Error("Usuario no autenticado");
  let professional = await Professionals.findOne({ where: { idUser } });
  if (!professional) {
    professional = await Professionals.create({ idUser });
  }
  return professional.id;
}

// ========== PROFESSIONALS (perfil CV) ==========
export const getProfessional = async (req, res) => {
  try {
    const idUser = req.user?.userId;
    if (!idUser) return res.status(401).json({ message: "No autenticado" });
    let professional = await Professionals.findOne({ where: { idUser } });
    if (!professional) professional = await Professionals.create({ idUser });
    res.json(professional);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfessional = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await Professionals.update(req.body, { where: { id: professionalId } });
    res.json({ message: "Perfil actualizado" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Lista de plantillas de CV (para manejador) */
export const getTemplates = async (req, res) => {
  try {
    const list = await CvTemplate.findAll({ order: [["id", "ASC"]] });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Guardar plantillas importadas (JSON). body: { templates: [ { name, description, type, sections, componentKey } ] } */
export const saveTemplates = async (req, res) => {
  try {
    const { templates } = req.body || {};
    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ message: "Se requiere un array 'templates' con al menos una plantilla." });
    }
    const toCreate = templates.map((t) => {
      const sections = t.sections != null
        ? (typeof t.sections === "string" ? t.sections : JSON.stringify(t.sections || []))
        : "[]";
      return {
        name: t.name || "Sin nombre",
        description: t.description ?? null,
        type: t.type || "Completa",
        sections,
        componentKey: t.componentKey || "completa",
      };
    });
    await CvTemplate.bulkCreate(toCreate);
    res.json({ message: `${toCreate.length} plantilla(s) guardada(s) en la base de datos.` });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error al guardar plantillas." });
  }
};

/** Devuelve todos los datos del CV del usuario para vista/PDF (user, userData, professional, todas las secciones) */
export const getFullCv = async (req, res) => {
  try {
    const idUser = req.user?.userId;
    if (!idUser) return res.status(401).json({ message: "No autenticado" });

    const [user, userData, professional] = await Promise.all([
      Users.findByPk(idUser),
      UserData.findOne({ where: { idUser } }),
      Professionals.findOne({ where: { idUser } }).then((p) => p || Professionals.create({ idUser })),
    ]);

    if (!professional) return res.status(500).json({ message: "Error al cargar CV" });
    const professionalId = professional.id;

    const [
      academicTraining,
      teachingExperience,
      coursesWorkshops,
      intellectualProduction,
      books,
      merits,
      languages,
      professionalExperience,
    ] = await Promise.all([
      AcademicTraining.findAll({ where: { professionalId } }),
      TeachingExperience.findAll({ where: { professionalId } }),
      CoursesWorkshops.findAll({ where: { professionalId } }),
      IntellectualProduction.findAll({ where: { professionalId } }),
      Books.findAll({ where: { professionalId } }),
      AcademicProfessionalMerits.findAll({ where: { professionalId } }),
      Languages.findAll({ where: { professionalId } }),
      ProfessionalExperience.findAll({ where: { professionalId } }),
    ]);

    res.json({
      user: user ? user.toJSON() : null,
      userData: userData ? userData.toJSON() : null,
      professional: professional.toJSON(),
      academicTraining,
      teachingExperience,
      coursesWorkshops,
      intellectualProduction,
      books,
      merits,
      languages,
      professionalExperience,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== ACADEMIC TRAINING ==========
export const addAcademicTraining = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await AcademicTraining.create({ ...req.body, professionalId });
    res.json({ message: "Agregado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const editAcademicTraining = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await AcademicTraining.update(req.body, {
      where: { id: req.params.academicId, professionalId },
    });
    res.json({ message: "Editado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteAcademicTraining = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await AcademicTraining.destroy({
      where: { id: req.params.academicId, professionalId },
    });
    res.json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getAllAcademicTraining = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    const list = await AcademicTraining.findAll({ where: { professionalId } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== TEACHING EXPERIENCE ==========
export const addTeachingExperience = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await TeachingExperience.create({ ...req.body, professionalId });
    res.json({ message: "Agregado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const editTeachingExperience = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await TeachingExperience.update(req.body, {
      where: { id: req.params.teachingId, professionalId },
    });
    res.json({ message: "Editado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteTeachingExperience = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await TeachingExperience.destroy({
      where: { id: req.params.teachingId, professionalId },
    });
    res.json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getAllTeachingExperience = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    const list = await TeachingExperience.findAll({ where: { professionalId } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== COURSES WORKSHOPS ==========
export const addCoursesWorkshops = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await CoursesWorkshops.create({ ...req.body, professionalId });
    res.json({ message: "Agregado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const editCoursesWorkshops = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await CoursesWorkshops.update(req.body, {
      where: { id: req.params.courseId, professionalId },
    });
    res.json({ message: "Editado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteCoursesWorkshops = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await CoursesWorkshops.destroy({
      where: { id: req.params.courseId, professionalId },
    });
    res.json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getAllCoursesWorkshops = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    const list = await CoursesWorkshops.findAll({ where: { professionalId } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== INTELLECTUAL PRODUCTION ==========
export const addIntellectualProduction = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await IntellectualProduction.create({ ...req.body, professionalId });
    res.json({ message: "Agregado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const editIntellectualProduction = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await IntellectualProduction.update(req.body, {
      where: { id: req.params.intellectualId, professionalId },
    });
    res.json({ message: "Editado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteIntellectualProduction = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await IntellectualProduction.destroy({
      where: { id: req.params.intellectualId, professionalId },
    });
    res.json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getAllIntellectualProduction = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    const list = await IntellectualProduction.findAll({ where: { professionalId } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== BOOKS ==========
export const addBooks = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await Books.create({ ...req.body, professionalId });
    res.json({ message: "Agregado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const editBooks = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await Books.update(req.body, {
      where: { id: req.params.bookId, professionalId },
    });
    res.json({ message: "Editado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteBooks = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await Books.destroy({
      where: { id: req.params.bookId, professionalId },
    });
    res.json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getAllBooks = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    const list = await Books.findAll({ where: { professionalId } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== ACADEMIC PROFESSIONAL MERITS ==========
export const addAcademicProfessionalMerits = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await AcademicProfessionalMerits.create({ ...req.body, professionalId });
    res.json({ message: "Agregado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const editAcademicProfessionalMerits = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await AcademicProfessionalMerits.update(req.body, {
      where: { id: req.params.meritId, professionalId },
    });
    res.json({ message: "Editado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteAcademicProfessionalMerits = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await AcademicProfessionalMerits.destroy({
      where: { id: req.params.meritId, professionalId },
    });
    res.json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getAllAcademicProfessionalMerits = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    const list = await AcademicProfessionalMerits.findAll({ where: { professionalId } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== LANGUAGES ==========
export const addLanguages = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await Languages.create({ ...req.body, professionalId });
    res.json({ message: "Agregado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const editLanguages = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await Languages.update(req.body, {
      where: { id: req.params.languageId, professionalId },
    });
    res.json({ message: "Editado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteLanguages = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await Languages.destroy({
      where: { id: req.params.languageId, professionalId },
    });
    res.json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getAllLanguages = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    const list = await Languages.findAll({ where: { professionalId } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== PROFESSIONAL EXPERIENCE ==========
export const addProfessionalExperience = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await ProfessionalExperience.create({ ...req.body, professionalId });
    res.json({ message: "Agregado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const editProfessionalExperience = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await ProfessionalExperience.update(req.body, {
      where: { id: req.params.experienceId, professionalId },
    });
    res.json({ message: "Editado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteProfessionalExperience = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    await ProfessionalExperience.destroy({
      where: { id: req.params.experienceId, professionalId },
    });
    res.json({ message: "Eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getAllProfessionalExperience = async (req, res) => {
  try {
    const professionalId = await getOrCreateProfessionalId(req);
    const list = await ProfessionalExperience.findAll({ where: { professionalId } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
