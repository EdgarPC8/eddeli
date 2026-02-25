import { sequelize } from "../database/connection.js";
import { DataTypes } from "sequelize";
import { Users } from "./Users.js";

// Perfil CV (uno por usuario). Foto y datos editables son de la hoja de vida; no confundir con perfil del sistema.
export const Professionals = sequelize.define(
  "cv_professionals",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idUser: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    photo: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    summary: {
      type: DataTypes.TEXT,
      defaultValue: null,
    },
    personalEmail: {
      type: DataTypes.STRING(120),
      defaultValue: null,
    },
    institutionalEmail: {
      type: DataTypes.STRING(120),
      defaultValue: null,
    },
    academicLevel: {
      type: DataTypes.STRING(80),
      defaultValue: null,
    },
    professionalTitle: {
      type: DataTypes.STRING(150),
      defaultValue: null,
    },
  },
  { timestamps: false }
);

// Formación académica
export const AcademicTraining = sequelize.define(
  "cv_academic_training",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    professionalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: { type: DataTypes.TEXT, defaultValue: null },
    date: { type: DataTypes.DATEONLY, defaultValue: null },
    place: { type: DataTypes.TEXT, defaultValue: null },
    country: { type: DataTypes.TEXT, defaultValue: null },
    obtainedTitle: { type: DataTypes.TEXT, defaultValue: null },
    educationalInstitution: { type: DataTypes.TEXT, defaultValue: null },
    senescytRegistrationN: { type: DataTypes.TEXT, defaultValue: null },
  },
  { timestamps: false }
);

// Experiencia docente
export const TeachingExperience = sequelize.define(
  "cv_teaching_experience",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    professionalId: { type: DataTypes.INTEGER, allowNull: false },
    educationalInstitution: { type: DataTypes.TEXT, defaultValue: null },
    subject: { type: DataTypes.TEXT, defaultValue: null },
    startDate: { type: DataTypes.DATEONLY, defaultValue: null },
    endDate: { type: DataTypes.DATEONLY, defaultValue: null },
    modality: { type: DataTypes.TEXT, defaultValue: null },
    place: { type: DataTypes.TEXT, defaultValue: null },
    country: { type: DataTypes.TEXT, defaultValue: null },
  },
  { timestamps: false }
);

// Cursos, talleres, seminarios
export const CoursesWorkshops = sequelize.define(
  "cv_courses_workshops",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    professionalId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.TEXT, defaultValue: null },
    name: { type: DataTypes.TEXT, defaultValue: null },
    organizedBy: { type: DataTypes.TEXT, defaultValue: null },
    place: { type: DataTypes.TEXT, defaultValue: null },
    duration: { type: DataTypes.TEXT, defaultValue: null },
    startDate: { type: DataTypes.TEXT, defaultValue: null },
    endDate: { type: DataTypes.TEXT, defaultValue: null },
  },
  { timestamps: false }
);

// Producción intelectual
export const IntellectualProduction = sequelize.define(
  "cv_intellectual_production",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    professionalId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.TEXT, defaultValue: null },
    name: { type: DataTypes.TEXT, defaultValue: null },
    typeAuthorship: { type: DataTypes.TEXT, defaultValue: null },
    date: { type: DataTypes.TEXT, defaultValue: null },
    webLink: { type: DataTypes.TEXT, defaultValue: null },
  },
  { timestamps: false }
);

// Libros
export const Books = sequelize.define(
  "cv_books",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    professionalId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.TEXT, defaultValue: null },
    type: { type: DataTypes.TEXT, defaultValue: null },
    typeAuthorship: { type: DataTypes.TEXT, defaultValue: null },
    isbN: { type: DataTypes.TEXT, defaultValue: null },
    editorialName: { type: DataTypes.TEXT, defaultValue: null },
    editorialOrigin: { type: DataTypes.TEXT, defaultValue: null },
    year: { type: DataTypes.TEXT, defaultValue: null },
  },
  { timestamps: false }
);

// Méritos académicos y profesionales
export const AcademicProfessionalMerits = sequelize.define(
  "cv_academic_professional_merits",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    professionalId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.TEXT, defaultValue: null },
    date: { type: DataTypes.TEXT, defaultValue: null },
    type: { type: DataTypes.TEXT, defaultValue: null },
    grantedBy: { type: DataTypes.TEXT, defaultValue: null },
    country: { type: DataTypes.TEXT, defaultValue: null },
    location: { type: DataTypes.TEXT, defaultValue: null },
  },
  { timestamps: false }
);

// Idiomas
export const Languages = sequelize.define(
  "cv_languages",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    professionalId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.TEXT, defaultValue: null },
    typeCertification: { type: DataTypes.TEXT, defaultValue: null },
    speakingLevel: { type: DataTypes.TEXT, defaultValue: null },
    writingLevel: { type: DataTypes.TEXT, defaultValue: null },
    comprehensionLevel: { type: DataTypes.TEXT, defaultValue: null },
  },
  { timestamps: false }
);

// Experiencia profesional
export const ProfessionalExperience = sequelize.define(
  "cv_professional_experience",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    professionalId: { type: DataTypes.INTEGER, allowNull: false },
    companyInstitution: { type: DataTypes.STRING(50), defaultValue: null },
    position: { type: DataTypes.STRING(50), defaultValue: null },
    responsibilities: { type: DataTypes.STRING(50), defaultValue: null },
    immediateHead: { type: DataTypes.STRING(50), defaultValue: null },
    telephone: { type: DataTypes.STRING(10), defaultValue: null },
    startDate: { type: DataTypes.DATEONLY, defaultValue: null },
    endDate: { type: DataTypes.DATEONLY, defaultValue: null },
  },
  { timestamps: false }
);

// Relaciones: Users -> Professionals
Users.hasMany(Professionals, { foreignKey: "idUser", onDelete: "CASCADE" });
Professionals.belongsTo(Users, { foreignKey: "idUser" });

// Professionals -> cada entidad CV
const cvModels = [
  AcademicTraining,
  TeachingExperience,
  CoursesWorkshops,
  IntellectualProduction,
  Books,
  AcademicProfessionalMerits,
  Languages,
  ProfessionalExperience,
];
cvModels.forEach((Model) => {
  Professionals.hasMany(Model, { foreignKey: "professionalId", onDelete: "CASCADE" });
  Model.belongsTo(Professionals, { foreignKey: "professionalId" });
});
