import mongoose from "mongoose";
import { teamService } from "./team.service.js";
import response from "../../utils/response.js";
import {
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  changeLeaderSchema,
} from "./team.validation.js";

/**
 * Validate MongoDB ObjectId helper
 */
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const notFoundErrors = new Set(["Team not found"]);

const badRequestErrors = new Set([
  "Team name already exists",
  "Leader not found",
  "Leader already belongs to a team",
  "New leader must be a member of this team",
  "Cannot delete a BUSY team. Wait until the team is AVAILABLE.",
  "Cannot delete team with active timelines. Complete or cancel them first.",
  "Cannot delete team with members. Remove all members first.",
  "User not found",
  "Only users with role 'Citizen' or 'Rescue Team' can be added to a team",
  "User already belongs to a team",
  "Cannot remove yourself from the team",
  "Cannot remove the team leader. Change leader first.",
  "Cannot change leader while the team is BUSY",
  "User is already the leader of this team",
]);

const sendMappedTeamError = (res, err) => {
  const errorMessage = err?.message || "Unexpected error while processing team request";

  if (notFoundErrors.has(errorMessage)) {
    return response.sendError(res, {
      message: errorMessage,
      statusCode: 404,
    });
  }

  if (badRequestErrors.has(errorMessage)) {
    return response.sendError(res, {
      message: errorMessage,
      statusCode: 400,
    });
  }

  return response.sendError(res, {
    message: "Unexpected error while processing team request",
    statusCode: 500,
  });
};

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
    const { status, name, sortBy, order, active, leader } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (name) filter.name = { $regex: name, $options: "i" };

    const options = {};
    if (typeof active !== "undefined") {
      const parsedActive = Number(active);
      if (!Number.isInteger(parsedActive) || parsedActive < 0) {
        return response.sendError(res, {
          message: "active must be a non-negative integer",
          statusCode: 400,
        });
      }
      options.active = parsedActive;
    }

    if (leader) {
      options.leader = leader;
    }

    const sort = {};
    if (sortBy) {
      const allowedFields = ["name", "status", "createdAt", "active", "leader"];
      if (allowedFields.includes(sortBy)) {
        const sortDirection = order === "asc" ? 1 : -1;
        if (sortBy === "active") {
          sort["memberStats.active"] = sortDirection;
        } else if (sortBy === "leader") {
          sort["teamLeader.displayName"] = sortDirection;
        } else {
          sort[sortBy] = sortDirection;
        }
      }
    } else {
      sort.createdAt = -1;
    }

    const result = await teamService.getAllTeams(filter, { page, limit }, sort, options);

    const { data, ...pagination } = result;

    return response.sendSuccess(res, {
      data,
      meta: pagination,
    });
  } catch (err) {
    return sendMappedTeamError(res, err);
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
    return sendMappedTeamError(res, err);
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
    return sendMappedTeamError(res, err);
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
    return sendMappedTeamError(res, err);
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
    return sendMappedTeamError(res, err);
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
    return sendMappedTeamError(res, err);
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

    const member = await teamService.removeMember(teamId, userId, req.user.id);
    return response.sendSuccess(res, {
      data: member,
      message: "Member removed successfully",
    });
  } catch (err) {
    return sendMappedTeamError(res, err);
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
