import MissionRequest, { MISSION_REQUEST_STATUS } from "./missionRequest.model.js";

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
}

const missionRequestRepository = new MissionRequestRepository();

export { missionRequestRepository };
