import { Router } from "express";
import { 
    getLogs ,
    createLicense,
} from "../controllers/ComandsController.js";
import { downloadBackup, insertData, saveBackup } from "../database/insertData.js";
import { isAuthenticated } from "../middlewares/authMiddelware.js";



const router = Router();

router.get("/createLicense", isAuthenticated,createLicense);
router.get("/getLogs", isAuthenticated,getLogs);
router.get("/saveBackup", isAuthenticated,saveBackup);
router.get("/downloadBackup", isAuthenticated,downloadBackup);
router.get("/reloadBD", isAuthenticated,insertData);

export default router;
