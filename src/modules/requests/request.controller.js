import mongoose from "mongoose";
import { requestService } from "./request.service.js";
import { authRepository } from "../auth/auth.repository.js";
import {
  addRequestSchema,
  verifyRequestSchema,
  cancelRequestSchema,
  markDuplicateSchema,
  updateLocationSchema,
  updatePrioritySchema,
  createRequestOnBehalfSchema,
} from "./request.validation.js";

// ─── Helpers ──────────────────────────────────────────────

function validateObjectId(id, res) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid request ID" });
    return false;
  }
  return true;
}

function validateBody(schema, body, res) {
  const { error, value } = schema.validate(body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join("."),
      message: d.message,
    }));
    res.status(400).json({ message: "Validation failed", errors });
    return null;
  }
  return value;
}

function handleError(err, res) {
  const status = err.statusCode || 400;
  res.status(status).json({ message: err.message });
}

// ─── Create ───────────────────────────────────────────────

/**
 * POST /requests
 * Actor: Citizen / Coordinator
 */
export const addRequest = async (req, res) => {
  try {
    const value = validateBody(addRequestSchema, req.body, res);
    if (!value) return;

    const result = await requestService.createRequest(req.user.id, value);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Read ─────────────────────────────────────────────────

/**
 * GET /requests/:requestId
 */
export const getRequest = async (req, res) => {
  try {
    if (!validateObjectId(req.params.requestId, res)) return;

    const request = await requestService.getRequestById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    res.json(request);
  } catch (err) {
    handleError(err, res);
  }
};

/**
 * GET /requests
 * Coordinator/Team: returns all requests with priority sorting
 */
export const getAllRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.incidentType) filter.incidentType = req.query.incidentType;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.userName)
      filter.userName = new RegExp(req.query.userName, "i");
    if (req.query.source) filter.source = req.query.source;
    if (req.query.createdBy) filter.createdBy = req.query.createdBy;

    // Use priority-sorted query for coordinators
    const result = await requestService.getAllRequestsPrioritized(filter, {
      page,
      limit,
    });

    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
};

/**
 * GET /requests/my
 * Citizen: returns their own requests
 */
export const getMyRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.incidentType) filter.incidentType = req.query.incidentType;
    if (req.query.priority) filter.priority = req.query.priority;

    const result = await requestService.getRequestsByUser(req.user.id, filter, {
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Verify / Reject ─────────────────────────────────────

/**
 * PATCH /requests/:requestId/verify
 * Actor: Coordinator
 * Body: { approved: true/false, priority?: string, reason?: string }
 */
export const verifyRequest = async (req, res) => {
  try {
    if (!validateObjectId(req.params.requestId, res)) return;
    const value = validateBody(verifyRequestSchema, req.body, res);
    if (!value) return;

    const updated = await requestService.verifyRequest(
      req.params.requestId,
      value,
    );
    const action = value.approved ? "verified" : "rejected";

    res.json({
      message: `Request ${action} successfully`,
      data: updated,
    });
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Close ────────────────────────────────────────────────

/**
 * PATCH /requests/:requestId/close
 * Actor: Coordinator
 */
export const closeRequest = async (req, res) => {
  try {
    if (!validateObjectId(req.params.requestId, res)) return;

    const updated = await requestService.closeRequest(req.params.requestId);
    res.json({ message: "Request closed successfully", data: updated });
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Cancel ───────────────────────────────────────────────

/**
 * PATCH /requests/:requestId/cancel
 * Actor: Citizen (own request) or Coordinator
 */
export const cancelRequest = async (req, res) => {
  try {
    if (!validateObjectId(req.params.requestId, res)) return;
    const value = validateBody(cancelRequestSchema, req.body, res);
    if (!value) return;

    const updated = await requestService.cancelRequest(req.params.requestId, {
      reason: value.reason,
      userId: req.user.id,
      userRole: req.user.role,
    });

    res.json({ message: "Request cancelled successfully", data: updated });
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Duplicate ────────────────────────────────────────────

/**
 * PATCH /requests/:requestId/duplicate
 * Actor: Coordinator
 * Body: { duplicatedOfRequestId: string }
 */
export const markDuplicate = async (req, res) => {
  try {
    if (!validateObjectId(req.params.requestId, res)) return;
    const value = validateBody(markDuplicateSchema, req.body, res);
    if (!value) return;

    const updated = await requestService.markAsDuplicate(
      req.params.requestId,
      value.duplicatedOfRequestId,
    );

    res.json({
      message: "Request marked as duplicate successfully",
      data: updated,
    });
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Location ─────────────────────────────────────────────

/**
 * PATCH /requests/:requestId/location
 * Actor: Coordinator
 * Body: { location: { type: "Point", coordinates: [lng, lat] }, isLocationVerified?: boolean }
 */
export const updateLocation = async (req, res) => {
  try {
    if (!validateObjectId(req.params.requestId, res)) return;
    const value = validateBody(updateLocationSchema, req.body, res);
    if (!value) return;

    const updated = await requestService.updateLocation(
      req.params.requestId,
      value,
    );

    res.json({
      message: "Request location updated successfully",
      data: updated,
    });
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Priority ─────────────────────────────────────────────

/**
 * PATCH /requests/:requestId/priority
 * Actor: Coordinator
 * Body: { priority: "Critical" | "High" | "Normal" }
 */
export const updatePriority = async (req, res) => {
  try {
    if (!validateObjectId(req.params.requestId, res)) return;
    const value = validateBody(updatePrioritySchema, req.body, res);
    if (!value) return;

    const updated = await requestService.updatePriority(
      req.params.requestId,
      value.priority,
    );

    res.json({
      message: "Request priority updated successfully",
      data: updated,
    });
  } catch (err) {
    handleError(err, res);
  }
};

// ─── On Behalf ───────────────────────────────────────────

/**
 * POST /requests/on-behalf
 * Actor: Coordinator
 */
export const createRequestOnBehalf = async (req, res) => {
  try {
    const value = validateBody(createRequestOnBehalfSchema, req.body, res);
    if (!value) return;

    const result = await requestService.createRequestOnBehalf(
      req.user.id,
      value,
    );

    res.status(201).json(result);
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Citizen Search ──────────────────────────────────────

/**
 * GET /requests/search-citizens?q=keyword
 * Actor: Coordinator
 */
export const searchCitizens = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Search query must be at least 2 characters" });
    }

    const citizens = await authRepository.searchCitizens(q.trim());
    res.json({ data: citizens });
  } catch (err) {
    handleError(err, res);
  }
};
