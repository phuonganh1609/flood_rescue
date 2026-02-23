import express from "express";
const router = express.Router();
import * as authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
<<<<<<< HEAD
import {
  registerSchema,
  loginSchema,
  createRescueTeamSchema,
  addMemberTeamSchema,
  addRequestSchema,
} from "./auth.validation.js";
import { uploadFileForUser } from "../../middlewares/uploadMiddleware.js";

// Auth routes
=======
import { registerSchema, loginSchema } from "./auth.validation.js";
// Public routes
>>>>>>> d32bbffa137e8b9f1b01ef9648d7ee13aa68177b
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);

// Protected routes
router.get("/me", authenticate, authController.getUser);
router.post("/logout", authenticate, authController.logout);
// Request routes
<<<<<<< HEAD
router.post(
  "/addRequest",
  authenticate,
  uploadFileForUser.array("requestMedia", 5),
  validate(addRequestSchema),
  authController.addRequest,
);
=======
>>>>>>> d32bbffa137e8b9f1b01ef9648d7ee13aa68177b

export default router;
