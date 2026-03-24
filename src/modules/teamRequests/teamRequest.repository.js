import TeamRequest from "./teamRequest.model.js";

function mergeSupplies(baseSupplies = [], deltaSupplies = []) {
  const merged = [...baseSupplies.map((item) => ({ ...item }))];

  for (const incoming of deltaSupplies) {
    const existing = merged.find((s) => s.name === incoming.name);
    if (existing) {
      existing.deliveredQty = (existing.deliveredQty || 0) + (incoming.deliveredQty || 0);
    } else {
      merged.push({
        name: incoming.name,
        deliveredQty: incoming.deliveredQty || 0,
      });
    }
  }

  return merged;
}

class TeamRequestRepository {
  async create(data) {
    const doc = new TeamRequest(data);
    return await doc.save();
  }

  async findById(id) {
    return await TeamRequest.findById(id)
      .populate("missionId")
      .populate("missionRequestId")
      .populate("teamId", "name")
      .populate("lastUpdatedBy", "displayName userName role");
  }

  async findAll(filter = {}, pagination = { page: 1, limit: 10 }, sort = { createdAt: -1 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      TeamRequest.find(filter)
        .populate("missionId")
        .populate("missionRequestId")
        .populate("teamId", "name")
        .populate("lastUpdatedBy", "displayName userName role")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      TeamRequest.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createMatrix({ missionId, missionRequestIds = [], teamIds = [] }) {
    if (!missionId || missionRequestIds.length === 0 || teamIds.length === 0) {
      return { matched: 0, upserted: 0 };
    }

    const ops = [];
    for (const missionRequestId of missionRequestIds) {
      for (const teamId of teamIds) {
        ops.push({
          updateOne: {
            filter: { missionRequestId, teamId },
            update: {
              $setOnInsert: {
                missionId,
                missionRequestId,
                teamId,
                rescuedCountTotal: 0,
                suppliesDeliveredTotal: [],
                lastUpdatedAt: null,
                lastUpdatedBy: null,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (ops.length === 0) {
      return { matched: 0, upserted: 0 };
    }

    const result = await TeamRequest.bulkWrite(ops, { ordered: false });
    return {
      matched: result.matchedCount || 0,
      upserted: result.upsertedCount || 0,
    };
  }

  async upsertContribution({
    missionId,
    missionRequestId,
    teamId,
    peopleRescuedIncrement = 0,
    suppliesDelivered = [],
    updatedBy = null,
  }) {
    let doc = await TeamRequest.findOne({ missionRequestId, teamId });
    if (!doc) {
      doc = new TeamRequest({ missionId, missionRequestId, teamId });
    }

    if (peopleRescuedIncrement > 0) {
      doc.rescuedCountTotal += peopleRescuedIncrement;
    }

    if (suppliesDelivered.length > 0) {
      doc.suppliesDeliveredTotal = mergeSupplies(doc.suppliesDeliveredTotal, suppliesDelivered);
    }

    doc.lastUpdatedAt = new Date();
    if (updatedBy) {
      doc.lastUpdatedBy = updatedBy;
    }

    await doc.save();
    return await this.findById(doc._id);
  }

  async getContributionSummaryByMissionRequestId(missionRequestId) {
    const rows = await TeamRequest.find({ missionRequestId })
      .populate("teamId", "name")
      .sort({ lastUpdatedAt: -1 })
      .lean();

    const totalRescued = rows.reduce(
      (sum, row) => sum + (row.rescuedCountTotal || 0),
      0,
    );

    const supplies = mergeSupplies(
      [],
      rows.flatMap((row) => row.suppliesDeliveredTotal || []),
    );

    return {
      teamContributions: rows,
      totalRescued,
      totalSuppliesDelivered: supplies,
    };
  }

  async markComplete(id, { outcome, note, completedBy }) {
    const updated = await TeamRequest.findByIdAndUpdate(
      id,
      {
        completedAt: new Date(),
        completedBy,
        outcome,
        note,
      },
      { new: true },
    );

    if (!updated) {
      return null;
    }

    return await this.findById(id);
  }

  async findByMissionAndTeam(missionId, teamId) {
    return await TeamRequest.find({ missionId, teamId })
      .populate("missionRequestId")
      .populate("teamId", "name")
      .sort({ createdAt: 1 })
      .lean();
  }

  async countIncompleteByMissionAndTeam(missionId, teamId) {
    return await TeamRequest.countDocuments({
      missionId,
      teamId,
      completedAt: null,
    });
  }

  async findCompletedByMissionAndTeam(missionId, teamId) {
    return await TeamRequest.find({
      missionId,
      teamId,
      completedAt: { $ne: null },
    })
      .select("outcome")
      .lean();
  }
}

const teamRequestRepository = new TeamRequestRepository();

export { teamRequestRepository, mergeSupplies };
