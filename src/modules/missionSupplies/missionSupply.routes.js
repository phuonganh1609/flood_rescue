// routes/missionSupply.routes.js
import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import {getAll, updateAllocation} from "./missionSupply.controller.js";
import { validateMissionSupplyQuery } from "./missionSupply.validation.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize(["Rescue Team", "Manager", "Admin", "Rescue Coordinator"]),
  validateMissionSupplyQuery,
  getAll
);

router.patch(
  "/:id/allocate",
  authenticate,
  authorize(["Manager", "Admin"]),
  updateAllocation
);

export default router;