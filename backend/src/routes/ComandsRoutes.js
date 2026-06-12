import { Router } from "express";
import {
  getLogs,
  createLicense,
  reloadBdController,
  uploadBackupController,
  saveBackupController,
} from "../controllers/ComandsController.js";
import { downloadBackup } from "../database/insertData.js";
import { isAuthenticated, requireProgrammer } from "../middlewares/authMiddelware.js";
import multer from "multer";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

/**
 * Rutas destructivas / sensibles: login + rol Programador.
 * Antes upload-backup estaba público → cualquiera podía subir un backup.json.
 */
router.get("/createLicense", isAuthenticated, requireProgrammer, createLicense);
router.get("/getLogs", isAuthenticated, requireProgrammer, getLogs);
router.get("/saveBackup", isAuthenticated, requireProgrammer, saveBackupController);
router.get("/downloadBackup", isAuthenticated, requireProgrammer, downloadBackup);
router.get("/reloadBD", isAuthenticated, requireProgrammer, reloadBdController);
router.post(
  "/upload-backup",
  isAuthenticated,
  requireProgrammer,
  upload.single("backup"),
  uploadBackupController,
);

export default router;
