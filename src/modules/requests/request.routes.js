import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import {
  addRequest,
  getRequest,
  getAllRequests,
  getMyRequests,
  updateRequestStatus,
} from "./request.controller.js";

const router = express.Router();

// Create a new request
router.post(
  "/addRequest",
  authenticate,
  addRequest
);

// Get all requests with pagination and filtering
router.get("/", authenticate, authorize(["Rescue Coordinator", "Rescue Team"]), getAllRequests);

// Get current user's requests
router.get("/my", authenticate, getMyRequests);

// Get a specific request by ID
router.get("/:requestId", authenticate, getRequest);

// Update request status
router.patch("/:requestId/status", authenticate, authorize(["Rescue Coordinator"]), updateRequestStatus);

export default router;
