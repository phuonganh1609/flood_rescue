import express from "express";
import missionRequestController from "./missionRequest.controller.js";
import {
  missionRequestActionSchema,
  missionRequestIdParamSchema,
} from "./missionRequest.validation.js";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize(["Rescue Coordinator", "Admin"]),
  missionRequestController.getAll,
);

router.get(
  "/:id",
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  validate(missionRequestIdParamSchema, "params"),
  missionRequestController.getById,
);

router.patch(
  "/:id/close",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(missionRequestIdParamSchema, "params"),
  validate(missionRequestActionSchema),
  missionRequestController.closeById,
);

router.patch(
  "/:id/drop",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(missionRequestIdParamSchema, "params"),
  validate(missionRequestActionSchema),
  missionRequestController.dropById,
);

export default router;
