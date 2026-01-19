const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const { authenticate, authorize } = require("../../middlewares/authMiddleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  registerSchema,
  loginSchema,
  createRescueTeamSchema,
  addMemberTeamSchema,
  addRequestSchema,
} = require("./auth.validation");

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
  validate(addRequestSchema),
  authController.addRequest,
);

module.exports = router;
