import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import {
  createNotification,
  getMyNotifications,
  getNotificationsByUser,
  getNotificationById,
  markAsRead,
  deleteNotification,
  deleteAllNotificationsByUser
} from "./notification.controller.js";

// All authenticated roles
const ALL_ROLES = ["Citizen", "Rescue Team", "Rescue Coordinator", "Admin", "Manager"];

const router = express.Router();

/**
 * POST /notifications - Create a new notification (internal use)
 */
router.post(
  "/",
  authenticate,
  authorize(ALL_ROLES),
  createNotification
);

/**
 * GET /notifications/me - Get notifications for the authenticated user
 * ⚠️ Must be defined BEFORE /:userId to avoid param conflict
 */
router.get(
  "/me",
  authenticate,
  getMyNotifications
);

/**
 * GET /notifications/detail/:notificationId - Get a single notification
 * ⚠️ Must be defined BEFORE /:userId to avoid param conflict
 */
router.get(
  "/detail/:notificationId",
  authenticate,
  authorize(ALL_ROLES),
  getNotificationById
);

/**
 * GET /notifications/:userId - Get all notifications for a user
 */
router.get(
  "/:userId",
  authenticate,
  authorize(ALL_ROLES),
  getNotificationsByUser
);

/**
 * PATCH /notifications/read/:notificationId - Mark notification as read
 */
router.patch(
  "/read/:notificationId",
  authenticate,
  authorize(ALL_ROLES),
  markAsRead
);

/**
 * DELETE /notifications/user/:userId - Delete all notifications for a user
 * ⚠️ Must be defined BEFORE /:notificationId to avoid param conflict
 */
router.delete(
  "/user/:userId",
  authenticate,
  authorize(ALL_ROLES),
  deleteAllNotificationsByUser
);

/**
 * DELETE /notifications/:notificationId - Delete a notification
 */
router.delete(
  "/:notificationId",
  authenticate,
  authorize(ALL_ROLES),
  deleteNotification
);

export default router;