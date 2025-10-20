import { Router } from "express";
import {
  getNotificationsByUser,
  createNotification,
  markAsSeen,
  deleteNotification,
  getUnreadCountByUser,
} from "../controllers/NotificationsController.js";
import { isAuthenticated } from "../middlewares/authMiddelware.js";



const router = new Router();

// routes/notifications.js
router.get("/unreadCount/:userId", isAuthenticated,getUnreadCountByUser);
router.get("/:userId", isAuthenticated,getNotificationsByUser);
router.post("", isAuthenticated,createNotification);
router.put("/seen/:id", isAuthenticated,markAsSeen);
router.delete("/:id", isAuthenticated,deleteNotification);

export default router;

