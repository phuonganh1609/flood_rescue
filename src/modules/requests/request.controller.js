import mongoose from "mongoose";
import { requestService } from "./request.service.js";
import { addRequestSchema, updateRequestStatusSchema } from "./request.validation.js";

/**
 * Controller for Request operations
 */

/**
 * Create a new request
 * POST /requests/addRequest
 */
export const addRequest = async (req, res) => {
  try {
    // Validate request data
    const { error, value } = addRequestSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    const userId = req.user.id;

    const result = await requestService.createRequest(userId, value);

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Get request by ID
 * GET /requests/:requestId
 */
export const getRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const request = await requestService.getRequestById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Get all requests
 * GET /requests
 */
export const getAllRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const type = req.query.type;
    const incidentType = req.query.incidentType;
    const userName = req.query.userName;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (incidentType) filter.incidentType = incidentType;
    if (priority) filter.priority = priority;
    if (userName) filter.userName = new RegExp(userName, "i");

    const result = await requestService.getAllRequests(filter, {
      page,
      limit,
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Update request status
 * PATCH /requests/:requestId/status
 */
export const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    // Validate request data
    const { error, value } = updateRequestStatusSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    const updatedRequest = await requestService.updateRequestStatus(
      requestId,
      value.status
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({
      message: "Request status updated successfully",
      data: updatedRequest,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Get requests of current user
 * GET /requests/my
 */
export const getMyRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const status = req.query.status;
    const type = req.query.type;
    const incidentType = req.query.incidentType;
    const priority = req.query.priority;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (incidentType) filter.incidentType = incidentType;
    if (priority) filter.priority = priority;

    const result = await requestService.getRequestsByUser(
      req.user.id,
      filter,
      {
        page,
        limit,
      }
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};