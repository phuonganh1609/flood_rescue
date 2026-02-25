import express from "express";
import {
  authenticate,
  authorize,
  authorizeTeamMember,
  authorizeTeamLeader,
} from "../../middlewares/authMiddleware.js";
import {
  getAllTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  changeLeader,
} from "./team.controller.js";

const router = express.Router();

// ─── Coordinator / Admin ──────────────────────────────────

// List all teams
router.get(
  "/",
  authenticate,
  authorize(["Rescue Coordinator", "Admin"]),
  getAllTeams,
);

// Create a new team
router.post(
  "/",
  authenticate,
  authorize(["Rescue Coordinator", "Admin"]),
  createTeam,
);

// ─── Single Team ──────────────────────────────────────────

// Get team detail (with members)
router.get(
  "/:teamId",
  authenticate,
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  authorizeTeamMember,
  getTeam,
);

// Update team
router.patch(
  "/:teamId",
  authenticate,
  authorize(["Rescue Coordinator", "Admin"]),
  updateTeam,
);

// Delete team
router.delete(
  "/:teamId",
  authenticate,
  authorize(["Rescue Coordinator", "Admin"]),
  deleteTeam,
);

// Change team leader
router.patch(
  "/:teamId/leader",
  authenticate,
  authorize(["Rescue Coordinator", "Admin"]),
  changeLeader,
);

// ─── Team Members ─────────────────────────────────────────

// Add member to team
router.post(
  "/:teamId/members",
  authenticate,
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  authorizeTeamLeader,
  addMember,
);

// Remove member from team
router.delete(
  "/:teamId/members/:userId",
  authenticate,
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  authorizeTeamLeader,
  removeMember,
);

export default router;
