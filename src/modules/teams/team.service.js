import { teamRepository } from "./team.repository.js";
import User from "../users/user.model.js";
import Timeline from "../timelines/timeline.model.js";
import { TEAM_STATUS } from "./team.model.js";

/**
 * Service for Team operations
 */
class TeamService {
  /**
   * Create a new team
   * - Team name must be unique
   * - leaderId is optional (team can be created empty)
   * - If leaderId provided, assign leader as first member
   */
  async createTeam({ name, leaderId }) {
    // Check duplicate name
    const existing = await teamRepository.findByName(name);
    if (existing) {
      throw new Error("Team name already exists");
    }

    // Create team
    const team = await teamRepository.createTeam({ name, leaderId: leaderId || null });

    // If leader provided, assign leader to team
    if (leaderId) {
      await teamRepository.addMember(leaderId, team._id);
    }

    return await teamRepository.findById(team._id);
  }

  /**
   * Get team by ID with members
   */
  async getTeamById(teamId) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    const members = await teamRepository.findMembers(teamId);

    return { ...team.toObject(), members };
  }

  /**
   * Get all teams with pagination and filters
   */
  async getAllTeams(filter = {}, pagination = { page: 1, limit: 10 }, sort = { createdAt: -1 }) {
    return await teamRepository.findAll(filter, pagination, sort);
  }

  /**
   * Update team (name, leaderId)
   */
  async updateTeam(teamId, updateData) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // If changing name, check uniqueness
    if (updateData.name && updateData.name !== team.name) {
      const existing = await teamRepository.findByName(updateData.name);
      if (existing) {
        throw new Error("Team name already exists");
      }
    }

    // If changing leader, validate new leader
    if (
      updateData.leaderId &&
      updateData.leaderId !== team.leaderId.toString()
    ) {
      // Ensure new leader is a member of this team
      const members = await teamRepository.findMembers(teamId);
      const isMember = members.some(
        (m) => m._id.toString() === updateData.leaderId,
      );
      if (!isMember) {
        throw new Error("New leader must be a member of this team");
      }
    }

    return await teamRepository.updateTeam(teamId, updateData);
  }

  /**
   * Delete team
   * - Team must be AVAILABLE (not BUSY)
   * - No active timelines (ASSIGNED / EN_ROUTE / ON_SITE)
   * - Team must have no members (remove all members first)
   */
  async deleteTeam(teamId) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check team status
    if (team.status === TEAM_STATUS.BUSY) {
      throw new Error("Cannot delete a BUSY team. Wait until the team is AVAILABLE.");
    }

    // Check for active timelines
    const activeTimelines = await Timeline.countDocuments({
      teamId,
      status: { $in: ["ASSIGNED", "EN_ROUTE", "ON_SITE"] },
    });
    if (activeTimelines > 0) {
      throw new Error("Cannot delete team with active timelines. Complete or cancel them first.");
    }

    // Check for remaining members
    const members = await teamRepository.findMembers(teamId);
    if (members.length > 0) {
      throw new Error("Cannot delete team with members. Remove all members first.");
    }

    return await teamRepository.deleteTeam(teamId);
  }

  /**
   * Add member to team
   * - User must have role "Citizen" and no current team
   * - After adding, user role is updated to "Rescue Team" (via repository)
   */
  async addMember(teamId, userId) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Validate target user
    const targetUser = await User.findById(userId).select("role teamId");
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.role !== "Citizen") {
      throw new Error("Only users with role 'Citizen' can be added to a team");
    }

    if (targetUser.teamId) {
      throw new Error("User already belongs to a team");
    }

    return await teamRepository.addMember(userId, teamId);
  }

  /**
   * Remove member from team
   * - Cannot remove the leader (must change leader first)
   * - Cannot remove yourself
   */
  async removeMember(teamId, userId, requesterId) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Prevent self-removal
    if (requesterId === userId) {
      throw new Error("Cannot remove yourself from the team");
    }

    // Prevent removing the leader
    if (team.leaderId._id.toString() === userId) {
      throw new Error("Cannot remove the team leader. Change leader first.");
    }

    return await teamRepository.removeMember(userId);
  }

  /**
   * Change team leader
   * - Team must be AVAILABLE
   * - New leader must be a member of the team
   */
  async changeLeader(teamId, newLeaderId) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Only allow when team is AVAILABLE
    if (team.status === TEAM_STATUS.BUSY) {
      throw new Error("Cannot change leader while the team is BUSY");
    }

    // Check if new leader is already the leader
    if (team.leaderId._id.toString() === newLeaderId) {
      throw new Error("User is already the leader of this team");
    }

    // Verify new leader is a member of the team
    const members = await teamRepository.findMembers(teamId);
    const isMember = members.some((m) => m._id.toString() === newLeaderId);

    if (!isMember) {
      throw new Error("New leader must be a member of this team");
    }

    return await teamRepository.updateLeader(teamId, newLeaderId);
  }
}

const teamService = new TeamService();

export { teamService };
