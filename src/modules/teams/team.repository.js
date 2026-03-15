import Team from "./team.model.js";
import User from "../users/user.model.js";
import mongoose from "mongoose";

const LEADER_FIELDS = {
  _id: "$leaderInfo._id",
  displayName: "$leaderInfo.displayName",
  userName: "$leaderInfo.userName",
  email: "$leaderInfo.email",
  phoneNumber: "$leaderInfo.phoneNumber",
  role: "$leaderInfo.role",
};

const buildLeaderProjection = () => ({
  $cond: [
    { $ifNull: ["$leaderInfo._id", false] },
    LEADER_FIELDS,
    null,
  ],
});

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
  async findAll(filter = {}, pagination = { page: 1, limit: 10 }, sort = { createdAt: -1 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .populate("leaderId", "displayName userName email phoneNumber role")
        .skip(skip)
        .limit(limit)
        .sort(sort),
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
   * Build reusable aggregation pipeline for team stats
   */
  buildTeamStatsPipeline({ filter = {}, teamId = null, active = null, leader = null }) {
    const pipeline = [];

    if (teamId) {
      pipeline.push({
        $match: {
          ...filter,
          _id: new mongoose.Types.ObjectId(teamId),
        },
      });
    } else {
      pipeline.push({ $match: filter });
    }

    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "leaderId",
          foreignField: "_id",
          as: "leaderInfo",
        },
      },
      {
        $unwind: {
          path: "$leaderInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "teamId",
          as: "members",
        },
      },
      {
        $addFields: {
          teamLeader: buildLeaderProjection(),
          memberStats: {
            total: { $size: "$members" },
            rescue: {
              $size: {
                $filter: {
                  input: "$members",
                  as: "member",
                  cond: { $eq: ["$$member.role", "Rescue Team"] },
                },
              },
            },
            active: {
              $size: {
                $filter: {
                  input: "$members",
                  as: "member",
                  cond: { $eq: ["$$member.isActive", true] },
                },
              },
            },
          },
          leaderId: buildLeaderProjection(),
        },
      },
    );

    if (typeof active === "number") {
      pipeline.push({
        $match: {
          "memberStats.active": active,
        },
      });
    }

    if (leader) {
      pipeline.push({
        $match: {
          "teamLeader.displayName": { $regex: leader, $options: "i" },
        },
      });
    }

    return pipeline;
  }

  /**
   * Find all teams with computed member stats and leader details
   */
  async findAllWithStats(
    filter = {},
    pagination = { page: 1, limit: 10 },
    sort = { createdAt: -1 },
    options = {},
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const pipeline = this.buildTeamStatsPipeline({
      filter,
      active: options.active,
      leader: options.leader,
    });

    const sortStage = Object.keys(sort).length > 0 ? sort : { createdAt: -1 };

    pipeline.push(
      {
        $project: {
          members: 0,
          leaderInfo: 0,
        },
      },
      {
        $facet: {
          data: [{ $sort: sortStage }, { $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    );

    const [result] = await Team.aggregate(pipeline);
    const data = result?.data || [];
    const total = result?.total?.[0]?.count || 0;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Find team by ID with computed member stats and leader details
   */
  async findByIdWithStats(teamId) {
    const pipeline = this.buildTeamStatsPipeline({ teamId });
    pipeline.push(
      {
        $project: {
          leaderInfo: 0,
          "members.hashedPassword": 0,
          "members.avatarId": 0,
        },
      },
      { $limit: 1 },
    );

    const [team] = await Team.aggregate(pipeline);
    return team || null;
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
