import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import {
  addRequest,
  getRequest,
  getAllRequests,
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
router.get("/", authenticate, getAllRequests);

// Get a specific request by ID
router.get("/:requestId", authenticate, getRequest);

// Update request status
router.patch("/:requestId/status", authenticate, updateRequestStatus);

export default router;
