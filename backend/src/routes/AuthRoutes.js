import { Router } from "express";
import {
  login,                  
  verifytoken,
  getLicenses,
  addLicense,
  deleteLicense,
  updateLicense,
  getOneLicense,
  renoveLicense,
  changeRole
} from "../controllers/AuthController.js";
import { isAuthenticated } from "../middlewares/authMiddelware.js";

const router = Router();

router.post("/login", login);
router.post("/changeRole",isAuthenticated, changeRole);
router.get("/getSession",isAuthenticated, verifytoken);
router.get("/getLicenses",isAuthenticated, getLicenses);
router.post("/renoveLicense",isAuthenticated, renoveLicense);
router.post("/addLicense",isAuthenticated, addLicense);
router.delete("/license/:id",isAuthenticated, deleteLicense);
router.put("/license/:id",isAuthenticated, updateLicense);
router.get("/license/:id",isAuthenticated, getOneLicense);

export default router;
