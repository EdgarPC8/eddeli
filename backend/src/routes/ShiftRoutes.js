import express from "express";
import { isAuthenticated } from "../middlewares/authMiddelware.js";
import {
  closeShift,
  getActiveShift,
  getShiftById,
  getShifts,
  openShift,
} from "../controllers/InventoryControl/ShiftController.js";

const router = express.Router();

router.get("/active", isAuthenticated, getActiveShift);
router.get("/", isAuthenticated, getShifts);
router.get("/:id", isAuthenticated, getShiftById);
router.post("/open", isAuthenticated, openShift);
router.post("/:id/close", isAuthenticated, closeShift);

export default router;
