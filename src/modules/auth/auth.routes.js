import express from "express";
const router = express.Router();
import * as authController from "./auth.controller.js";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  createRescueTeamSchema,
  addMemberTeamSchema,
  addRequestSchema,
} from "./auth.validation.js";
import { uploadFileForUser } from "../../middlewares/uploadMiddleware.js";

// Auth routes
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/user", authenticate, authController.getUser);

// Rescue Team routes
router.post(
  "/createRescueTeam",
  authenticate,
  authorize(["Rescue Coordinator", "Admin", "Manager"]),
  validate(createRescueTeamSchema),
  authController.createRescueTeam,
);
router.post(
  "/addTeamMember",
  authenticate,
  authorize(["Rescue Coordinator", "Admin", "Manager"]),
  validate(addMemberTeamSchema),
  authController.addMemberTeam,
);

// Request routes
router.post(
  "/addRequest",
  authenticate,
  uploadFileForUser.array("requestMedia", 5),
  validate(addRequestSchema),
  authController.addRequest,
);

export default router;
