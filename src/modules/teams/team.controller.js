import mongoose from "mongoose";
import { teamService } from "./team.service.js";
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
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * GET /teams/:teamId
 */
export const getTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    const team = await teamService.getTeamById(teamId);
    res.json({ data: team });
  } catch (err) {
    if (err.message === "Team not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
};

/**
 * POST /teams
 */
export const createTeam = async (req, res) => {
  try {
    const { errors, value } = validate(createTeamSchema, req.body);
    if (errors) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const team = await teamService.createTeam(value);
    res.status(201).json({
      message: "Team created successfully",
      data: team,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * PATCH /teams/:teamId
 */
export const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    const { errors, value } = validate(updateTeamSchema, req.body);
    if (errors) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const team = await teamService.updateTeam(teamId, value);
    res.json({
      message: "Team updated successfully",
      data: team,
    });
  } catch (err) {
    if (err.message === "Team not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
};

/**
 * DELETE /teams/:teamId
 */
export const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    await teamService.deleteTeam(teamId);
    res.json({ message: "Team deleted successfully" });
  } catch (err) {
    if (err.message === "Team not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
};

/**
 * POST /teams/:teamId/members
 */
export const addMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    const { errors, value } = validate(addMemberSchema, req.body);
    if (errors) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const member = await teamService.addMember(teamId, value.userId);
    res.status(201).json({
      message: "Member added successfully",
      data: member,
    });
  } catch (err) {
    if (err.message === "Team not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
};

/**
 * DELETE /teams/:teamId/members/:userId
 */
export const removeMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    if (!isValidId(teamId) || !isValidId(userId)) {
      return res.status(400).json({ message: "Invalid team or user ID" });
    }

    const member = await teamService.removeMember(teamId, userId);
    res.json({
      message: "Member removed successfully",
      data: member,
    });
  } catch (err) {
    if (err.message === "Team not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
};

/**
 * PATCH /teams/:teamId/leader
 */
export const changeLeader = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!isValidId(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    const { errors, value } = validate(changeLeaderSchema, req.body);
    if (errors) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const team = await teamService.changeLeader(teamId, value.newLeaderId);
    res.json({
      message: "Team leader updated successfully",
      data: team,
    });
  } catch (err) {
    if (err.message === "Team not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
};
