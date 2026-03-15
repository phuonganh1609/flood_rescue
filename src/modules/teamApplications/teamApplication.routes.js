import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  approveTeamApplication,
  getMyTeamApplications,
  getTeamApplication,
  listTeamApplications,
  rejectTeamApplication,
  submitTeamApplication,
  withdrawTeamApplication,
} from "./teamApplication.controller.js";
import {
  createTeamApplicationSchema,
  listTeamApplicationsQuerySchema,
  rejectTeamApplicationSchema,
  teamApplicationIdParamSchema,
} from "./teamApplication.validation.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  validate(createTeamApplicationSchema, "body"),
  submitTeamApplication,
);

router.get(
  "/my",
  authenticate,
  validate(listTeamApplicationsQuerySchema, "query"),
  getMyTeamApplications,
);

router.get(
  "/",
  authenticate,
  authorize(["Rescue Coordinator", "Admin"]),
  validate(listTeamApplicationsQuerySchema, "query"),
  listTeamApplications,
);

router.get(
  "/:applicationId",
  authenticate,
  validate(teamApplicationIdParamSchema, "params"),
  getTeamApplication,
);

router.patch(
  "/:applicationId/withdraw",
  authenticate,
  validate(teamApplicationIdParamSchema, "params"),
  withdrawTeamApplication,
);

router.patch(
  "/:applicationId/approve",
  authenticate,
  authorize(["Rescue Coordinator", "Admin"]),
  validate(teamApplicationIdParamSchema, "params"),
  approveTeamApplication,
);

router.patch(
  "/:applicationId/reject",
  authenticate,
  authorize(["Rescue Coordinator", "Admin"]),
  validate(teamApplicationIdParamSchema, "params"),
  validate(rejectTeamApplicationSchema, "body"),
  rejectTeamApplication,
);

export default router;
