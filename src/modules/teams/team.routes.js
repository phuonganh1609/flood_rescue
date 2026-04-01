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
  getTeamStats,
  getRescueTrends,
  getTeamReport,
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

// ─── Team Statistics ────────────────────────────────────────

// Get team statistics
router.get(
  "/:teamId/stats",
  authenticate,
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  authorizeTeamMember,
  getTeamStats,
);

// Get rescue trends over time
router.get(
  "/:teamId/trends",
  authenticate,
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  authorizeTeamMember,
  getRescueTrends,
);

// Get comprehensive team report (stats + trends)
router.get(
  "/:teamId/report",
  authenticate,
  authorize(["Rescue Coordinator", "Admin", "Rescue Team"]),
  authorizeTeamMember,
  getTeamReport,
);

export default router;
