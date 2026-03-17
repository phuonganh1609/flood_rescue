import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  getTeamRequestById,
  listTeamRequests,
} from "./teamRequest.controller.js";
import {
  listTeamRequestsQuerySchema,
  teamRequestIdParamSchema,
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

export default router;
