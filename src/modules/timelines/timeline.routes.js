import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import timelineController from "./timeline.controller.js";
import {
  listTimelinesSchema,
  completeTimelineSchema,
  failTimelineSchema,
  withdrawTimelineSchema,
  cancelTimelineSchema,
  completeFromTeamRequestsSchema,
  completeTimelineAutoSchema,
  acceptTimelineSchema,
} from "./timeline.validation.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  validate(listTimelinesSchema, "query"),
  timelineController.getTimelines,
);

router.get(
  "/:id",
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  timelineController.getTimelineById,
);

router.patch("/:id/accept", authorize(["Rescue Team"]), validate(acceptTimelineSchema), timelineController.accept);
router.post("/:id/confirm-supply-claim", authorize(["Rescue Team"]), timelineController.confirmSupplyClaim);
router.patch("/:id/arrive", authorize(["Rescue Team"]), timelineController.arrive);

// DEPRECATED: Use POST /timelines/:id/complete instead
// router.patch(
//   "/:id/complete",
//   authorize(["Rescue Team"]),
//   validate(completeTimelineSchema),
//   timelineController.complete,
// );

router.patch(
  "/:id/fail",
  authorize(["Rescue Team"]),
  validate(failTimelineSchema),
  timelineController.fail,
);
router.patch(
  "/:id/withdraw",
  authorize(["Rescue Team"]),
  validate(withdrawTimelineSchema),
  timelineController.withdraw,
);

router.patch(
  "/:id/cancel",
  authorize(["Rescue Coordinator", "Admin"]),
  validate(cancelTimelineSchema),
  timelineController.cancel,
);

router.post(
  "/:id/complete",
  authorize(["Rescue Team"]),
  validate(completeTimelineAutoSchema),
  timelineController.completeAuto,
);

export default router;

