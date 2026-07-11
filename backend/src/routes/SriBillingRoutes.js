import { Router } from "express";
import {
  isAuthenticated,
  requireAdminOrProgrammer,
  requireStaff,
} from "../middlewares/authMiddelware.js";
import {
  getSriBillingSettings,
  putSriBillingSettings,
  uploadSriCertificate,
  deleteSriCertificate,
  sriCertificateUploadMiddleware,
} from "../controllers/SriBillingController.js";

const router = Router();

router.get("/settings", isAuthenticated, requireStaff, getSriBillingSettings);
router.put("/settings", isAuthenticated, requireAdminOrProgrammer, putSriBillingSettings);
router.post(
  "/certificate",
  isAuthenticated,
  requireAdminOrProgrammer,
  sriCertificateUploadMiddleware,
  uploadSriCertificate,
);
router.delete("/certificate", isAuthenticated, requireAdminOrProgrammer, deleteSriCertificate);

export default router;
