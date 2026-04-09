import express from "express";
import missionController from "./mission.controller.js";
import {
  createMissionSchema,
  updateMissionSchema,
  addRequestsSchema,
  addTeamsSchema,
  removeRequestParamsSchema,
  removeTeamParamsSchema,
  startMissionSchema,
  queryMissionSchema,
  getMissionRequestsQuerySchema,
} from "./mission.validation.js";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = express.Router();

// Apply auth to all mission routes
router.use(authenticate);

// CRUD
router.post(
  "/",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(createMissionSchema),
  missionController.createMission,
);
router.get(
  "/",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(queryMissionSchema, "query"),
  missionController.getMissions,
);
router.get(
  "/:id",
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  missionController.getMissionById,
);
router.get(
  "/:id/requests",
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  validate(getMissionRequestsQuerySchema, "query"),
  missionController.getMissionRequests,
);
router.get(
  "/:id/accept-info",
  authorize(["Rescue Team"]),
  missionController.getAcceptInfo,
);
router.patch(
  "/:id",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(updateMissionSchema),
  missionController.updateMission,
);
router.delete(
  "/:id",
  authorize(["Rescue Coordinator", "Admin"]),
  missionController.deleteMission,
);

// Mission actions
router.post(
  "/:id/requests",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(addRequestsSchema),
  missionController.addRequests,
);
router.post(
  "/:id/teams",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(addTeamsSchema),
  missionController.addTeams,
);
router.delete(
  "/:id/requests/:requestId",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(removeRequestParamsSchema, "params"),
  missionController.removeRequest,
);
router.delete(
  "/:id/teams/:teamId",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(removeTeamParamsSchema, "params"),
  missionController.removeTeam,
);
router.patch(
  "/:id/start",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(startMissionSchema),
  missionController.startMission,
);
router.patch(
  "/:id/pause",
  authorize(["Rescue Coordinator", "Admin"]),
  missionController.pauseMission,
);
router.patch(
  "/:id/resume",
  authorize(["Rescue Coordinator", "Admin"]),
  missionController.resumeMission,
);
router.patch(
  "/:id/abort",
  authorize(["Rescue Coordinator", "Admin"]),
  missionController.abortMission,
);

export default router;
