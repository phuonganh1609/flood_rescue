import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listUsersQuerySchema,
  updateRoleSchema,
  userIdParamSchema,
} from "./user.validation.js";
import { listUsers, updateUserRole } from "./user.controller.js";

const router = express.Router();

// ─── User Listing ─────────────────────────────────────────

/**
 * GET /api/users
 * List users (filter, search, pagination)
 * - Admin: sees all users
 * - Coordinator: sees only Citizen & Rescue Team
 */
router.get(
  "/",
  authenticate,
  authorize(["Admin", "Rescue Coordinator"]),
  validate(listUsersQuerySchema, "query"),
  listUsers,
);


/**
 * PATCH /api/users/:id/role
 * Update user role
 */
router.patch(
  "/:id/role",
  authenticate,
  authorize(["Admin"]),
  validate(userIdParamSchema, "params"),
  validate(updateRoleSchema, "body"),
  updateUserRole,
);

export default router;
