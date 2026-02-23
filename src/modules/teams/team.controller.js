import mongoose from "mongoose";
import { teamService } from "./team.service.js";
import response from "../../utils/response.js";
import {
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
} from "./team.validation.js";

/**
 * Validate MongoDB ObjectId helper
 */
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validate request body against schema
 */
const validate = (schema, body) => {
  const { error, value } = schema.validate(body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return { errors };
  }
  return { value };
};

// ─── Handlers ──────────────────────────────────────────────

/**
 * GET /teams
 */
export const getAllTeams = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const filter = {};
    if (status) filter.status = status;

    const result = await teamService.getAllTeams(filter, { page, limit });

    const { data, ...pagination } = result;

    return response.sendSuccess(res, {
      data,
      meta: pagination,
    });
  } catch (err) {
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};

/**
 * GET /teams/:teamId
 */
export const getTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return response.sendError(res, {
        message: "Invalid team ID",
        statusCode: 400,
      });
    }

    const team = await teamService.getTeamById(teamId);
    return response.sendSuccess(res, { data: team });
  } catch (err) {
    if (err.message === "Team not found") {
      return response.sendError(res, {
        message: err.message,
        statusCode: 404,
      });
    }
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};

/**
 * POST /teams
 */
export const createTeam = async (req, res) => {
  try {
    const { errors, value } = validate(createTeamSchema, req.body);
    if (errors) {
      return response.sendError(res, {
        message: "Validation failed",
        statusCode: 400,
        errors,
      });
    }

    const team = await teamService.createTeam(value);
    return response.sendSuccess(res, {
      data: team,
      statusCode: 201,
      message: "Team created successfully",
    });
  } catch (err) {
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};

/**
 * PATCH /teams/:teamId
 */
export const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return response.sendError(res, {
        message: "Invalid team ID",
        statusCode: 400,
      });
    }

    const { errors, value } = validate(updateTeamSchema, req.body);
    if (errors) {
      return response.sendError(res, {
        message: "Validation failed",
        statusCode: 400,
        errors,
      });
    }

    const team = await teamService.updateTeam(teamId, value);
    return response.sendSuccess(res, {
      data: team,
      message: "Team updated successfully",
    });
  } catch (err) {
    if (err.message === "Team not found") {
      return response.sendError(res, {
        message: err.message,
        statusCode: 404,
      });
    }
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};

/**
 * DELETE /teams/:teamId
 */
export const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return response.sendError(res, {
        message: "Invalid team ID",
        statusCode: 400,
      });
    }

    await teamService.deleteTeam(teamId);
    return response.sendSuccess(res, {
      message: "Team deleted successfully",
    });
  } catch (err) {
    if (err.message === "Team not found") {
      return response.sendError(res, {
        message: err.message,
        statusCode: 404,
      });
    }
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};

/**
 * POST /teams/:teamId/members
 */
export const addMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return response.sendError(res, {
        message: "Invalid team ID",
        statusCode: 400,
      });
    }

    const { errors, value } = validate(addMemberSchema, req.body);
    if (errors) {
      return response.sendError(res, {
        message: "Validation failed",
        statusCode: 400,
        errors,
      });
    }

    const member = await teamService.addMember(teamId, value.userId);
    return response.sendSuccess(res, {
      data: member,
      statusCode: 201,
      message: "Member added successfully",
    });
  } catch (err) {
    if (err.message === "Team not found") {
      return response.sendError(res, {
        message: err.message,
        statusCode: 404,
      });
    }
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};

/**
 * DELETE /teams/:teamId/members/:userId
 */
export const removeMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    if (!isValidId(teamId) || !isValidId(userId)) {
      return response.sendError(res, {
        message: "Invalid team or user ID",
        statusCode: 400,
      });
    }

    const member = await teamService.removeMember(teamId, userId);
    return response.sendSuccess(res, {
      data: member,
      message: "Member removed successfully",
    });
  } catch (err) {
    if (err.message === "Team not found") {
      return response.sendError(res, {
        message: err.message,
        statusCode: 404,
      });
    }
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};

/**
 * PATCH /teams/:teamId/leader
 */
export const changeLeader = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return response.sendError(res, {
        message: "Invalid team ID",
        statusCode: 400,
      });
    }

    const { errors, value } = validate(changeLeaderSchema, req.body);
    if (errors) {
      return response.sendError(res, {
        message: "Validation failed",
        statusCode: 400,
        errors,
      });
    }

    const team = await teamService.changeLeader(teamId, value.newLeaderId);
    return response.sendSuccess(res, {
      data: team,
      message: "Team leader updated successfully",
    });
  } catch (err) {
    if (err.message === "Team not found") {
      return response.sendError(res, {
        message: err.message,
        statusCode: 404,
      });
    }
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};
