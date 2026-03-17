import MissionRequest, { MISSION_REQUEST_STATUS } from "./missionRequest.model.js";
import TeamRequest from "../teamRequests/teamRequest.model.js";

function normalizeSupplyName(name) {
  return typeof name === "string" ? name.trim() : "";
}

function mergeDeliveredSupplies(baseSupplies = [], deltaSupplies = []) {
  const merged = [...baseSupplies.map((item) => ({ ...item }))];

  for (const incoming of deltaSupplies) {
    const normalizedName = normalizeSupplyName(incoming.name);
    const deliveredQty = Number(incoming.deliveredQty) || 0;
    if (!normalizedName || deliveredQty <= 0) continue;

    const existing = merged.find((s) => normalizeSupplyName(s.name) === normalizedName);
    if (existing) {
      existing.deliveredQty = (existing.deliveredQty || 0) + deliveredQty;
    } else {
      merged.push({
        name: incoming.name,
        deliveredQty,
      });
    }
  }

  return merged;
}

function buildRequestedSuppliesMap(requestSuppliesSnapshot = []) {
  const requestedMap = new Map();

  for (const item of requestSuppliesSnapshot) {
    const name = normalizeSupplyName(item.name);
    if (!name) continue;

    requestedMap.set(name, (requestedMap.get(name) || 0) + (Number(item.requestedQty) || 0));
  }

  return requestedMap;
}

function calculateAggregateFields(missionRequest, contributionSummary = {}) {
  const totalRescued = Number(contributionSummary.totalRescued) || 0;
  const totalSuppliesDelivered = mergeDeliveredSupplies(
    [],
    contributionSummary.totalSuppliesDelivered || [],
  );
  const teamContributions = contributionSummary.teamContributions || [];

  const peopleNeeded = Number(missionRequest.peopleNeeded) || 0;
  const peopleRemaining = Math.max(0, peopleNeeded - totalRescued);

  const requestedSuppliesMap = buildRequestedSuppliesMap(
    missionRequest.requestSuppliesSnapshot || [],
  );
  const deliveredSuppliesMap = buildRequestedSuppliesMap(totalSuppliesDelivered);

  const totalSupplyTarget = [...requestedSuppliesMap.values()].reduce(
    (sum, qty) => sum + qty,
    0,
  );
  const totalSupplyDelivered = [...requestedSuppliesMap.entries()].reduce(
    (sum, [name, requestedQty]) => sum + Math.min(requestedQty, deliveredSuppliesMap.get(name) || 0),
    0,
  );

  const totalTarget = peopleNeeded + totalSupplyTarget;
  const totalDelivered = Math.min(peopleNeeded, totalRescued) + totalSupplyDelivered;
  const hasContribution = totalRescued > 0 || totalSuppliesDelivered.length > 0;
  const isFullyMet = totalTarget === 0 ? false : totalDelivered >= totalTarget;

  let status = MISSION_REQUEST_STATUS.PENDING;
  if (isFullyMet) {
    status = MISSION_REQUEST_STATUS.FULFILLED;
  } else if (hasContribution) {
    status = MISSION_REQUEST_STATUS.PARTIAL;
  }

  const handledByTeamIds = teamContributions
    .filter((row) => {
      const rescued = Number(row.rescuedCountTotal) || 0;
      const supplies = Array.isArray(row.suppliesDeliveredTotal)
        ? row.suppliesDeliveredTotal.length
        : 0;
      return rescued > 0 || supplies > 0;
    })
    .map((row) => row.teamId?._id?.toString?.() || row.teamId?.toString?.())
    .filter(Boolean);

  return {
    peopleRescued: totalRescued,
    peopleRemaining,
    suppliesDelivered: totalSuppliesDelivered,
    fulfillmentPercent:
      totalTarget > 0
        ? Math.min(100, Math.round((totalDelivered / totalTarget) * 100))
        : 0,
    handledByTeamIds,
    status,
    isFullyMet,
    hasContribution,
  };
}

class MissionRequestRepository {
  async create(data) {
    const missionRequest = new MissionRequest(data);
    return await missionRequest.save();
  }

  async findById(id) {
    return await MissionRequest.findById(id)
      .populate("missionId")
      .populate("requestId")
      .populate("handledByTeamIds", "name")
      .populate("lastUpdatedByTimelineId");
  }

  async findByMissionId(missionId) {
    return await MissionRequest.find({ missionId })
      .populate("requestId")
      .sort({ createdAt: 1 });
  }

  async findAll(query = {}) {
    const { status, limit = 0, page = 1, sort = { createdAt: -1 } } = query;
    const filter = {};
    
    if (status) {
      if (Array.isArray(status)) {
        filter.status = { $in: status };
      } else {
        filter.status = status;
      }
    }
    
    let queryBuilder = MissionRequest.find(filter)
      .populate("missionId")
      .populate("requestId")
      .sort(sort);
      
    if (limit > 0) {
      const skip = (Math.max(1, page) - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(Number(limit));
    }
    
    return await queryBuilder;
  }

  async findByMissionIdsAndStatus(missionId, statuses = []) {
    return await MissionRequest.find({
      missionId,
      status: { $in: statuses },
    });
  }

  async findByRequestId(requestId) {
    return await MissionRequest.find({ requestId }).populate("missionId");
  }

  async findByMissionAndRequest(missionId, requestId) {
    return await MissionRequest.findOne({ missionId, requestId });
  }

  async deleteByMissionAndRequest(missionId, requestId) {
    return await MissionRequest.deleteOne({ missionId, requestId });
  }

  async incrementRescued(id, rescuedCount, timelineId = null, teamId = null) {
    const missionRequest = await MissionRequest.findById(id);
    if (!missionRequest) return null;

    missionRequest.peopleRescued += rescuedCount;
    missionRequest.peopleRemaining = Math.max(
      0,
      (missionRequest.peopleNeeded || 0) - missionRequest.peopleRescued,
    );

    missionRequest.fulfillmentPercent =
      missionRequest.peopleNeeded > 0 ?
        Math.min(
          100,
          Math.round((missionRequest.peopleRescued / missionRequest.peopleNeeded) * 100),
        )
      : 0;

    if (
      missionRequest.peopleNeeded > 0 &&
      missionRequest.peopleRescued >= missionRequest.peopleNeeded
    ) {
      missionRequest.status = MISSION_REQUEST_STATUS.FULFILLED;
      missionRequest.closedAt = new Date();
    } else if (missionRequest.peopleRescued > 0) {
      missionRequest.status = MISSION_REQUEST_STATUS.PARTIAL;
    }

    if (timelineId) missionRequest.lastUpdatedByTimelineId = timelineId;
    if (teamId && !missionRequest.handledByTeamIds.some((idValue) => idValue.toString() === teamId.toString())) {
      missionRequest.handledByTeamIds.push(teamId);
    }

    await missionRequest.save();
    return await this.findById(id);
  }

  async updateStatus(id, status) {
    const patch = { status };
    if ([MISSION_REQUEST_STATUS.FULFILLED, MISSION_REQUEST_STATUS.CLOSED].includes(status)) {
      patch.closedAt = new Date();
    }
    return await MissionRequest.findByIdAndUpdate(id, patch, { new: true });
  }

  async updateStatusWithNote(id, status, note = null) {
    const patch = { status };
    if (typeof note === "string") {
      patch.note = note;
    }
    if (
      [
        MISSION_REQUEST_STATUS.FULFILLED,
        MISSION_REQUEST_STATUS.CLOSED,
        MISSION_REQUEST_STATUS.DROPPED,
      ].includes(status)
    ) {
      patch.closedAt = new Date();
    }
    return await MissionRequest.findByIdAndUpdate(id, patch, { new: true })
      .populate("missionId")
      .populate("requestId")
      .populate("handledByTeamIds", "name")
      .populate("lastUpdatedByTimelineId");
  }

  async markPendingInProgressByMission(missionId) {
    return await MissionRequest.updateMany(
      {
        missionId,
        status: MISSION_REQUEST_STATUS.PENDING,
      },
      {
        $set: { status: MISSION_REQUEST_STATUS.IN_PROGRESS },
      },
    );
  }

  async updateFulfillment(id, fields) {
    return await MissionRequest.findByIdAndUpdate(id, fields, { new: true });
  }

  async syncAggregateFromContributionSummary(id, contributionSummary) {
    const missionRequest = await MissionRequest.findById(id);
    if (!missionRequest) return null;

    const aggregate = calculateAggregateFields(missionRequest, contributionSummary);
    const isManualTerminal = [
      MISSION_REQUEST_STATUS.CLOSED,
      MISSION_REQUEST_STATUS.DROPPED,
    ].includes(missionRequest.status);

    missionRequest.peopleRescued = aggregate.peopleRescued;
    missionRequest.peopleRemaining = aggregate.peopleRemaining;
    missionRequest.suppliesDelivered = aggregate.suppliesDelivered;
    missionRequest.fulfillmentPercent = aggregate.fulfillmentPercent;
    missionRequest.handledByTeamIds = aggregate.handledByTeamIds;

    if (!isManualTerminal) {
      missionRequest.status = aggregate.status;
      if (aggregate.status === MISSION_REQUEST_STATUS.FULFILLED) {
        missionRequest.closedAt = missionRequest.closedAt || new Date();
      } else {
        missionRequest.closedAt = null;
      }
    }

    await missionRequest.save();
    return await this.findById(id);
  }

  async findByMissionIdPaginated(missionId, { teamId = null, page = 1, limit = 10 } = {}) {
    const filter = { missionId };
    if (teamId) {
      // Filter by TeamRequest assignment (pre-created at mission start — Option A)
      const assignedMrIds = await TeamRequest.find({ missionId, teamId }).distinct("missionRequestId");
      filter._id = { $in: assignedMrIds };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      MissionRequest.find(filter)
        .populate({
          path: "requestId",
          select: "userName phoneNumber location peopleCount priority requestSupplies media",
        })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      MissionRequest.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateProgress(id, { peopleRescuedIncrement = 0, suppliesDelivered = [], teamId = null, timelineId = null } = {}) {
    const missionRequest = await MissionRequest.findById(id);
    if (!missionRequest) return null;

    // Update people rescued
    if (peopleRescuedIncrement > 0) {
      missionRequest.peopleRescued += peopleRescuedIncrement;
      missionRequest.peopleRemaining = Math.max(
        0,
        (missionRequest.peopleNeeded || 0) - missionRequest.peopleRescued,
      );
      missionRequest.fulfillmentPercent =
        missionRequest.peopleNeeded > 0
          ? Math.min(100, Math.round((missionRequest.peopleRescued / missionRequest.peopleNeeded) * 100))
          : 0;
    }

    // Merge supplies delivered (additive, không overwrite)
    if (suppliesDelivered.length > 0) {
      for (const incoming of suppliesDelivered) {
        const existing = missionRequest.suppliesDelivered.find(
          (s) => s.name === incoming.name,
        );
        if (existing) {
          existing.deliveredQty = (existing.deliveredQty || 0) + incoming.deliveredQty;
        } else {
          missionRequest.suppliesDelivered.push(incoming);
        }
      }
    }

    // Auto-transition status based on fulfillmentPercent
    const notTerminal = ![
      MISSION_REQUEST_STATUS.FULFILLED,
      MISSION_REQUEST_STATUS.CLOSED,
      MISSION_REQUEST_STATUS.DROPPED,
    ].includes(missionRequest.status);

    if (notTerminal) {
      if (
        missionRequest.peopleNeeded > 0 &&
        missionRequest.peopleRescued >= missionRequest.peopleNeeded
      ) {
        missionRequest.status = MISSION_REQUEST_STATUS.FULFILLED;
        missionRequest.closedAt = new Date();
      } else if (missionRequest.peopleRescued > 0 || missionRequest.suppliesDelivered.length > 0) {
        missionRequest.status = MISSION_REQUEST_STATUS.PARTIAL;
      }
    }

    if (timelineId) missionRequest.lastUpdatedByTimelineId = timelineId;
    if (teamId && !missionRequest.handledByTeamIds.some((tid) => tid.toString() === teamId.toString())) {
      missionRequest.handledByTeamIds.push(teamId);
    }

    await missionRequest.save();
    return await this.findById(id);
  }
}

const missionRequestRepository = new MissionRequestRepository();

export { missionRequestRepository, calculateAggregateFields, mergeDeliveredSupplies };
