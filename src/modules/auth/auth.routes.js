import express from "express";
const router = express.Router();
import * as authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { registerSchema, loginSchema } from "./auth.validation.js";

// Public routes
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);

// Protected routes
router.get("/me", authenticate, authController.getUser);
router.post("/logout", authenticate, authController.logout);

export default router;
