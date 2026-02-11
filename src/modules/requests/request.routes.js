import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import {
  addRequest,
  getRequest,
  getAllRequests,
  getMyRequests,
  verifyRequest,
  closeRequest,
  cancelRequest,
  markDuplicate,
  updateLocation,
  updatePriority,
} from "./request.controller.js";

const router = express.Router();

// ─── Citizen ──────────────────────────────────────────────

// Create a new request
router.post("/", authenticate, addRequest);

// Get current user's requests
router.get("/my", authenticate, getMyRequests);

// ─── Coordinator / Team ───────────────────────────────────

// Get all requests (priority sorted)
router.get(
  "/",
  authenticate,
  authorize(["Rescue Coordinator", "Rescue Team"]),
  getAllRequests,
);

// ─── Single Request ───────────────────────────────────────

// Get request by ID
router.get("/:requestId", authenticate, getRequest);

// ─── Coordinator Actions ──────────────────────────────────

// Verify or reject request
router.patch(
  "/:requestId/verify",
  authenticate,
  authorize(["Rescue Coordinator"]),
  verifyRequest,
);

// Close request
router.patch(
  "/:requestId/close",
  authenticate,
  authorize(["Rescue Coordinator"]),
  closeRequest,
);

// Mark as duplicate
router.patch(
  "/:requestId/duplicate",
  authenticate,
  authorize(["Rescue Coordinator"]),
  markDuplicate,
);

// Update location & verify
router.patch(
  "/:requestId/location",
  authenticate,
  authorize(["Rescue Coordinator"]),
  updateLocation,
);

// Update priority
router.patch(
  "/:requestId/priority",
  authenticate,
  authorize(["Rescue Coordinator"]),
  updatePriority,
);

// ─── Citizen / Coordinator ────────────────────────────────

// Cancel request (citizen own or coordinator any)
router.patch("/:requestId/cancel", authenticate, cancelRequest);

export default router;
