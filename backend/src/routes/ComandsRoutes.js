import { Router } from "express";
import {
  getLogs,
  createLicense,
  reloadBdController,
  uploadBackupController,
  saveBackupController,
  listBackupsController,
  setMainBackupController,
  deleteStoredBackupController,
  downloadStoredBackupController,
  downloadMainBackupController,
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
router.get("/backups", isAuthenticated, requireProgrammer, listBackupsController);
router.get("/backups/main/download", isAuthenticated, requireProgrammer, downloadMainBackupController);
router.get("/backups/stored/:filename/download", isAuthenticated, requireProgrammer, downloadStoredBackupController);
router.post("/backups/stored/:filename/set-main", isAuthenticated, requireProgrammer, setMainBackupController);
router.delete("/backups/stored/:filename", isAuthenticated, requireProgrammer, deleteStoredBackupController);
router.get("/reloadBD", isAuthenticated, requireProgrammer, reloadBdController);
router.post(
  "/upload-backup",
  isAuthenticated,
  requireProgrammer,
  upload.single("backup"),
  uploadBackupController,
);

export default router;
