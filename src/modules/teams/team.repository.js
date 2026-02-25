import Team from "./team.model.js";
import User from "../users/user.model.js";

/**
 * Repository for Team operations
 */
class TeamRepository {
  /**
   * Create a new team
   */
  async createTeam(teamData) {
    const team = new Team(teamData);
    return await team.save();
  }

  /**
   * Find team by ID (populate leader)
   */
  async findById(teamId) {
    return await Team.findById(teamId).populate(
      "leaderId",
      "displayName userName email phoneNumber role",
    );
  }

  /**
   * Find team by name
   */
  async findByName(name) {
    return await Team.findOne({ name });
  }

  /**
   * Find all teams with pagination
   */
  async findAll(filter = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .populate("leaderId", "displayName userName email phoneNumber role")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Team.countDocuments(filter),
    ]);

    return {
      data: teams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update team
   */
  async updateTeam(teamId, updateData) {
    return await Team.findByIdAndUpdate(teamId, updateData, {
      new: true,
    }).populate("leaderId", "displayName userName email phoneNumber role");
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId) {
    return await Team.findByIdAndDelete(teamId);
  }

  /**
   * Get all members of a team (query User by teamId)
   */
  async findMembers(teamId) {
    return await User.find({ teamId }).select(
      "displayName userName email phoneNumber role teamId",
    );
  }

  /**
   * Assign user to team (set User.teamId) and update role to "Rescue Team"
   */
  async addMember(userId, teamId) {
    return await User.findByIdAndUpdate(
      userId,
      { teamId, role: "Rescue Team" },
      { new: true },
    ).select("displayName userName email phoneNumber role teamId");
  }

  /**
   * Remove user from team (clear User.teamId)
   */
  async removeMember(userId) {
    return await User.findByIdAndUpdate(
      userId,
      { teamId: null },
      { new: true },
    ).select("displayName userName email phoneNumber role teamId");
  }

  /**
   * Clear all members from a team (for team deletion)
   */
  async clearAllMembers(teamId) {
    return await User.updateMany({ teamId }, { teamId: null });
  }

  /**
   * Update team status
   */
  async updateStatus(teamId, status) {
    return await Team.findByIdAndUpdate(teamId, { status }, { new: true });
  }

  /**
   * Update team leader
   */
  async updateLeader(teamId, newLeaderId) {
    return await Team.findByIdAndUpdate(
      teamId,
      { leaderId: newLeaderId },
      { new: true },
    ).populate("leaderId", "displayName userName email phoneNumber role");
  }
}

const teamRepository = new TeamRepository();

export { teamRepository };
