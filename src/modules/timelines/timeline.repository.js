import Timeline, { TIMELINE_STATUS } from "./timeline.model.js";

const ACTIVE_TIMELINE_STATUSES = [
  TIMELINE_STATUS.ASSIGNED,
  TIMELINE_STATUS.EN_ROUTE,
  TIMELINE_STATUS.ON_SITE,
];

const EXECUTING_TIMELINE_STATUSES = [
  TIMELINE_STATUS.CLAIMING_SUPPLIES,
  TIMELINE_STATUS.EN_ROUTE,
  TIMELINE_STATUS.ON_SITE,
];

const TERMINAL_TIMELINE_STATUSES = [
  TIMELINE_STATUS.COMPLETED,
  TIMELINE_STATUS.PARTIAL,
  TIMELINE_STATUS.FAILED,
  TIMELINE_STATUS.WITHDRAWN,
  TIMELINE_STATUS.CANCELLED,
];

class TimelineRepository {
  async create(data) {
    const timeline = new Timeline(data);
    return await timeline.save();
  }

  async findById(id) {
    return await Timeline.findById(id)
      .populate("missionId")
      .populate("teamId");
  }

  async findByIdLean(id) {
    return await Timeline.findById(id).lean();
  }

  async findAll(filter = {}, pagination = { page: 1, limit: 10 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [timelines, total] = await Promise.all([
      Timeline.find(filter)
        .populate("missionId")
        .populate("teamId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Timeline.countDocuments(filter),
    ]);

    return {
      data: timelines,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByMissionId(missionId) {
    return await Timeline.find({ missionId }).lean();
  }

  async countActiveByTeamId(teamId) {
    return await Timeline.countDocuments({
      teamId,
      status: { $in: ACTIVE_TIMELINE_STATUSES },
    });
  }

  async updateById(id, updateData) {
    return await Timeline.findByIdAndUpdate(id, updateData, { new: true })
      .populate("missionId")
      .populate("teamId");
  }

  async transitionStatus(id, fromStatuses, updateData) {
    const allowedFrom = Array.isArray(fromStatuses) ? fromStatuses : [fromStatuses];
    return await Timeline.findOneAndUpdate(
      { _id: id, status: { $in: allowedFrom } },
      updateData,
      { new: true },
    )
      .populate("missionId")
      .populate("teamId");
  }

  async findOne(filter) {
    return await Timeline.findOne(filter)
      .populate("missionId")
      .populate("teamId");
  }

  async findActiveByMissionId(missionId) {
    return await Timeline.find({
      missionId,
      status: { $in: ACTIVE_TIMELINE_STATUSES },
    }).lean();
  }
}

const timelineRepository = new TimelineRepository();

export {
  timelineRepository,
  ACTIVE_TIMELINE_STATUSES,
  EXECUTING_TIMELINE_STATUSES,
  TERMINAL_TIMELINE_STATUSES,
};

