import express from "express";
import { isAuthenticated } from "../middlewares/authMiddelware.js";
import {
  createTaskPlan,
  executeTaskOpenBox,
  getMyTaskItems,
  getTaskAssignees,
  getTaskPlans,
  publishTaskPlan,
  updateTaskItemStatus,
} from "../controllers/InventoryControl/TaskController.js";

const router = express.Router();

router.get("/assignees", isAuthenticated, getTaskAssignees);
router.get("/plans", isAuthenticated, getTaskPlans);
router.post("/plans", isAuthenticated, createTaskPlan);
router.post("/plans/:id/publish", isAuthenticated, publishTaskPlan);
router.get("/my-items", isAuthenticated, getMyTaskItems);
router.put("/items/:id/status", isAuthenticated, updateTaskItemStatus);
router.post("/items/:id/execute-open-box", isAuthenticated, executeTaskOpenBox);

export default router;
