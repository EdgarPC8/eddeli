import { Router } from "express";
import { check, activate } from "../controllers/SubscriptionsController.js";
import { isAuthenticated } from "../middlewares/authMiddelware.js";

const router = new Router();

router.get("/check", isAuthenticated, check);
router.post("/activate", isAuthenticated, activate);

export default router;
