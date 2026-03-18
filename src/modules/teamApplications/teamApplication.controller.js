import response from "../../utils/response.js";
import { teamApplicationService } from "./teamApplication.service.js";

const statusMap = {
  "User not found": 404,
  "Application not found": 404,
  "You are not allowed to access this application": 403,
  "You can only withdraw your own application": 403,
  "Only Rescue Coordinator or Admin can review applications": 403,
  "Inactive users cannot submit rescue team applications": 403,
  "Only Citizen users can submit rescue team applications": 403,
  "Only Citizen applications can be approved": 400,
};

const handleError = (err, res) => {
  return response.sendError(res, {
    message: err.message,
    statusCode: statusMap[err.message] || 400,
  });
};

export const submitTeamApplication = async (req, res) => {
  try {
    const application = await teamApplicationService.submitApplication(req.user.id, req.body);
    return response.sendSuccess(res, {
      data: application,
      statusCode: 201,
      message: "Rescue team application submitted successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getMyTeamApplications = async (req, res) => {
  try {
    const result = await teamApplicationService.listOwnApplications(req.user.id, req.query);
    const { data, ...pagination } = result;

    return response.sendSuccess(res, {
      data,
      meta: pagination,
      message: "Team applications retrieved successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const listTeamApplications = async (req, res) => {
  try {
    const result = await teamApplicationService.listAllApplications(req.query);
    const { data, ...pagination } = result;

    return response.sendSuccess(res, {
      data,
      meta: pagination,
      message: "Team applications retrieved successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getTeamApplication = async (req, res) => {
  try {
    const application = await teamApplicationService.getApplicationById(
      req.params.applicationId,
      req.user,
    );

    return response.sendSuccess(res, {
      data: application,
      message: "Team application retrieved successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const withdrawTeamApplication = async (req, res) => {
  try {
    const application = await teamApplicationService.withdrawApplication(
      req.params.applicationId,
      req.user,
    );

    return response.sendSuccess(res, {
      data: application,
      message: "Team application withdrawn successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const approveTeamApplication = async (req, res) => {
  try {
    const application = await teamApplicationService.approveApplication(
      req.params.applicationId,
      req.user,
    );

    return response.sendSuccess(res, {
      data: application,
      message: "Team application approved successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const rejectTeamApplication = async (req, res) => {
  try {
    const application = await teamApplicationService.rejectApplication(
      req.params.applicationId,
      req.user,
      req.body,
    );

    return response.sendSuccess(res, {
      data: application,
      message: "Team application rejected successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};
