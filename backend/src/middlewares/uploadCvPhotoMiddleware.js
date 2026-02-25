import multer from "multer";
import path from "path";
import fs from "fs";
import fileDirName from "../libs/file-dirname.js";
import { unlink } from "fs/promises";
import { Professionals } from "../models/CV.js";

const { __dirname } = fileDirName(import.meta);

const IMG_BASE_DIR = path.join(__dirname, "../img");
const cvPhotosFolderRel = "alumni/cv";
const cvPhotosDestination = path.join(IMG_BASE_DIR, cvPhotosFolderRel);

if (!fs.existsSync(cvPhotosDestination)) {
  fs.mkdirSync(cvPhotosDestination, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(cvPhotosDestination)) {
      fs.mkdirSync(cvPhotosDestination, { recursive: true });
    }
    cb(null, cvPhotosDestination);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const idUser = req.user?.userId || "unknown";
    const photoName = `cvPhotoUserId${idUser}_${Date.now()}${ext}`;
    cb(null, photoName);
  },
});

const upload = multer({ storage: diskStorage }).single("photo");

const safeUnlink = async (fullPath) => {
  try {
    await unlink(fullPath);
  } catch {
    // ignorar si no existe
  }
};

export const uploadCvPhoto = async (req, res) => {
  const idUser = req.user?.userId;
  if (!idUser) return res.status(401).json({ message: "No autenticado" });

  let professional = await Professionals.findOne({ where: { idUser } });
  if (!professional) professional = await Professionals.create({ idUser });
  const oldRelPath = professional.photo || null;

  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: `Error al subir la foto: ${err.message}` });
    }
    try {
      if (!req.file?.filename) {
        return res.status(400).json({ message: "No se recibió archivo" });
      }
      const newRelPath = `${cvPhotosFolderRel}/${req.file.filename}`;
      await Professionals.update({ photo: newRelPath }, { where: { id: professional.id } });
      if (oldRelPath && oldRelPath !== newRelPath) {
        const oldFullPath = path.join(IMG_BASE_DIR, oldRelPath);
        await safeUnlink(oldFullPath);
      }
      return res.json({ message: "Foto de hoja de vida subida con éxito", photo: newRelPath });
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
};

export const deleteCvPhoto = async (req, res) => {
  const idUser = req.user?.userId;
  if (!idUser) return res.status(401).json({ message: "No autenticado" });
  const professional = await Professionals.findOne({ where: { idUser } });
  if (!professional?.photo) return res.status(404).json({ message: "No existe imagen de CV para eliminar" });
  try {
    const fullPath = path.join(IMG_BASE_DIR, professional.photo);
    await safeUnlink(fullPath);
    await Professionals.update({ photo: null }, { where: { id: professional.id } });
    return res.json({ message: "Foto de hoja de vida eliminada con éxito" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
