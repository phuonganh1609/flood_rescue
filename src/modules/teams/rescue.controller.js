import mongoose from "mongoose";
import { requestService} from "../requests/request.service.js";
import { updateRequestStatusSchema } from "../requests/request.validation.js";
import { rescueService } from "./rescue.service.js";
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

/**Create mission and assign team if status is In Progress
 *
 * 
 */
  export const createMissionAndAssignTeam = async (req, res) => {
    //check if status is in progress
    if (req.body.status === "In Progress") {
        try {
            const { requestId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(requestId)) {
                return res.status(400).json({ message: "Invalid request ID" });
            }
            const mission = await rescueService.createMissionAndAssignTeam(requestId, value.status);
            if (!mission) {
                return res.status(404).json({ message: "Mission could not be created" });
            }
            res.json({
                message: "Request status updated successfully",
                data: updatedRequest,
            });
        }catch (err) {
            res.status(400).json({ message: err.message });
        };
  };
    };
