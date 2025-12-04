// src/middlewares/uploadEdDeliMiddleware.js
import multer from "multer";
import { join, extname } from "path";
import fs from "fs";
import fileDirName from "../libs/file-dirname.js";
const { __dirname } = fileDirName(import.meta);

const edDeliDestination = join(__dirname, "../img/EdDeli");
if (!fs.existsSync(edDeliDestination)) {
  fs.mkdirSync(edDeliDestination, { recursive: true });
}

const slugify = (str = "") =>
  String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const storage = multer.diskStorage({
  destination: edDeliDestination,
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase() || ".jpg";
    // Prioridad de nombre: customFileName > name > originalname
    const base =
      req.body?.customFileName?.trim() ||
      req.body?.name?.trim() ||
      file.originalname.replace(ext, "");
    const safe = slugify(base);
    const rand = Math.random().toString(36).slice(2, 7);
    cb(null, `${safe}-${rand}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ok.includes(file.mimetype)) return cb(new Error("Solo imágenes"));
  cb(null, true);
};

export const edDeliUploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).single("image"); // el campo del form-data será "image"
