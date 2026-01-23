import express from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { uploadRequestMedia } from "../../middlewares/uploadMidleware.js";
import {
  addRequest,
  getRequest,
  getAllRequests,
  updateRequestStatus,
} from "./request.controller.js";

const router = express.Router();

// Create a new request with file uploads
router.post(
  "/addRequest",
  authenticate,
  uploadRequestMedia.array("images", 5),
  addRequest
);

// Get all requests with pagination and filtering
router.get("/", authenticate, getAllRequests);

// Get a specific request by ID
router.get("/:requestId", authenticate, getRequest);

// Update request status
router.patch("/:requestId/status", authenticate, updateRequestStatus);

export default router;
