import { requestService } from "./request.service.js";
import { addRequestSchema } from "./request.validation.js";

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
    const files = req.files || [];

    const result = await requestService.createRequest(
      userId,
      value,
      files
    );

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

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

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
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const updatedRequest = await requestService.updateRequestStatus(
      requestId,
      status
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