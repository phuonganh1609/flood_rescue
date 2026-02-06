import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import {
  createNotification,
  getNotificationsByUser,
  getNotificationById,
  markAsRead,
  deleteNotification,
  deleteAllNotificationsByUser
} from "./notification.controller.js";

const router = express.Router();

/**
 * POST /notifications - Create a new notification
 */
router.post(
  "/",
  authenticate,
  authorize(["USER", "COORDINATOR", "ADMIN", "MANAGER", "TEAM_LEADER"]),
  createNotification
);

/**
 * GET /notifications/:userId - Get all notifications for a user
 */
router.get(
  "/:userId",
  authenticate,
  authorize(["USER", "COORDINATOR", "ADMIN", "MANAGER", "TEAM_LEADER"]),
  getNotificationsByUser
);

/**
 * GET /notifications/detail/:notificationId - Get a single notification
 */
router.get(
  "/detail/:notificationId",
  authenticate,
  authorize(["USER", "COORDINATOR", "ADMIN", "MANAGER", "TEAM_LEADER"]),
  getNotificationById
);

/**
 * PATCH /notifications/read/:notificationId - Mark notification as read
 */
router.patch(
  "/read/:notificationId",
  authenticate,
  authorize(["USER", "COORDINATOR", "ADMIN", "MANAGER", "TEAM_LEADER"]),
  markAsRead
);

/**
 * DELETE /notifications/:notificationId - Delete a notification
 */
router.delete(
  "/:notificationId",
  authenticate,
  authorize(["USER", "COORDINATOR", "ADMIN", "MANAGER", "TEAM_LEADER"]),
  deleteNotification
);

/**
 * DELETE /notifications/user/:userId - Delete all notifications for a user
 */
router.delete(
  "/user/:userId",
  authenticate,
  authorize(["USER", "COORDINATOR", "ADMIN", "MANAGER", "TEAM_LEADER"]),
  deleteAllNotificationsByUser
);

export default router;