import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  getTeamRequestById,
  listTeamRequests,
  completeTeamRequest,
} from "./teamRequest.controller.js";
import {
  listTeamRequestsQuerySchema,
  teamRequestIdParamSchema,
  completeTeamRequestSchema,
} from "./teamRequest.validation.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  validate(listTeamRequestsQuerySchema, "query"),
  listTeamRequests,
);

router.get(
  "/:id",
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  validate(teamRequestIdParamSchema, "params"),
  getTeamRequestById,
);

router.post(
  "/:id/complete",
  authorize(["Rescue Team"]),
  validate(teamRequestIdParamSchema, "params"),
  validate(completeTeamRequestSchema, "body"),
  completeTeamRequest,
);

export default router;
