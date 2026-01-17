import multer from "multer";
import path from "path";
import fs from "fs";
import fileDirName from "../libs/file-dirname.js";
import { unlink } from "fs/promises";
import { Users } from "../models/Users.js";

const { __dirname } = fileDirName(import.meta);

const IMG_BASE_DIR = path.join(__dirname, "../img"); // ✅ base real: src/img
const photosFolderRel = "photos"; // ✅ subcarpeta dentro de src/img
const photosDestination = path.join(IMG_BASE_DIR, photosFolderRel);

if (!fs.existsSync(photosDestination)) {
  fs.mkdirSync(photosDestination, { recursive: true });
}
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Asegura que exista SIEMPRE (aunque alguien borró la carpeta después)
    if (!fs.existsSync(photosDestination)) {
      fs.mkdirSync(photosDestination, { recursive: true });
    }
    cb(null, photosDestination);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const photoName = `userPhotoProfileId${req.params.userId}${ext}`;
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

export const uploadPhoto = async (req, res) => {
  // 1) Leer foto anterior ANTES de subir/reemplazar en BD
  const user = await Users.findOne({
    attributes: ["photo"],
    where: { id: req.params.userId },
  });
  const oldRelPath = user?.photo || null; // ej: "photos/userPhotoProfileId12.jpg"

  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({
        message: `Error al subir la foto: ${err.message}`,
      });
    }

    try {
      if (!req.file?.filename) {
        return res.status(400).json({ message: "No se recibió archivo" });
      }

      // 2) Nueva ruta relativa para BD
      const newRelPath = `${photosFolderRel}/${req.file.filename}`;

      // 3) Actualiza BD
      await Users.update(
        { photo: newRelPath },
        { where: { id: req.params.userId } }
      );

      // 4) Borra la anterior si existe y es distinta a la nueva
      if (oldRelPath && oldRelPath !== newRelPath) {
        const oldFullPath = path.join(IMG_BASE_DIR, oldRelPath);
        await safeUnlink(oldFullPath);
      }

      return res.json({
        message: "Foto de perfil subida con éxito",
        photo: newRelPath,
      });
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
};

export const deletePhoto = async (req, res) => {
  const user = await Users.findOne({
    attributes: ["photo"],
    where: { id: req.params.userId },
  });

  const photoToDelete = user?.photo;

  if (!photoToDelete) {
    return res.status(404).json({ message: "No existe imagen para eliminar" });
  }

  try {
    const fullPath = path.join(IMG_BASE_DIR, photoToDelete); // ✅ "src/img/photos/xxx.jpg"
    await safeUnlink(fullPath);

    await Users.update(
      { photo: null },
      { where: { id: req.params.userId } }
    );

    return res.json({ message: "Foto de perfil eliminada con éxito" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
