import response from "../../utils/response.js";
import { teamRequestService } from "./teamRequest.service.js";

const handleError = (err, res) => {
  return response.sendError(res, {
    message: err.message || "Unexpected error while processing team request records",
    statusCode: err.statusCode || 400,
  });
};

const listTeamRequests = async (req, res) => {
  try {
    const result = await teamRequestService.getAll(req.query, req.user);
    const { data, ...meta } = result;

    return response.sendSuccess(res, {
      data,
      meta,
      message: "Team request records retrieved successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

const getTeamRequestById = async (req, res) => {
  try {
    const item = await teamRequestService.getById(req.params.id, req.user);

    return response.sendSuccess(res, {
      data: item,
      message: "Team request record retrieved successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export { listTeamRequests, getTeamRequestById };
