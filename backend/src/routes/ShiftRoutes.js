import express from "express";
import { isAuthenticated } from "../middlewares/authMiddelware.js";
import {
  closeShift,
  createShiftMovement,
  getActiveShift,
  getShiftById,
  getShiftMovements,
  getShifts,
  openShift,
} from "../controllers/InventoryControl/ShiftController.js";

const router = express.Router();

router.get("/active", isAuthenticated, getActiveShift);
router.get("/", isAuthenticated, getShifts);
router.get("/:id/movements", isAuthenticated, getShiftMovements);
router.post("/:id/movements", isAuthenticated, createShiftMovement);
router.get("/:id", isAuthenticated, getShiftById);
router.post("/open", isAuthenticated, openShift);
router.post("/:id/close", isAuthenticated, closeShift);

export default router;
