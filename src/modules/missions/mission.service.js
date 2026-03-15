import missionRepository from "./mission.repository.js";
import Timeline from "../timelines/timeline.model.js";
import timelineService from "../timelines/timeline.service.js";
import { requestRepository } from "../requests/request.repository.js";
import { REQUEST_STATUS } from "../requests/request.model.js";
import { teamRepository } from "../teams/team.repository.js";
import { eventBus } from "../../utils/events.js";

class MissionService {
  async buildMissionAbortedPayload(missionId) {
    const activeTimelines = await Timeline.find({
      missionId,
      status: { $in: ["ASSIGNED", "EN_ROUTE", "ON_SITE"] },
    })
      .populate("requestId")
      .populate("teamId");

    const requestIds = [
      ...new Set(
        activeTimelines
          .map((timeline) => timeline.requestId?._id?.toString?.() || timeline.requestId?.toString?.())
          .filter(Boolean),
      ),
    ];
    const teamIds = [
      ...new Set(
        activeTimelines
          .map((timeline) => timeline.teamId?._id?.toString?.() || timeline.teamId?.toString?.())
          .filter(Boolean),
      ),
    ];

    const [requests, teams] = await Promise.all([
      Promise.all(requestIds.map((requestId) => requestRepository.findRequestById(requestId))),
      Promise.all(teamIds.map((teamId) => teamRepository.findById(teamId))),
    ]);

    return {
      missionId,
      requestIds,
      citizenIds: [
        ...new Set(
          requests
            .map((request) => request?.userId?._id?.toString?.() || request?.userId?.toString?.())
            .filter(Boolean),
        ),
      ],
      teamLeaderIds: [
        ...new Set(
          teams
            .map((team) => team?.leaderId?._id?.toString?.() || team?.leaderId?.toString?.())
            .filter(Boolean),
        ),
      ],
      teamNames: [
        ...new Set(teams.map((team) => team?.name).filter(Boolean)),
      ],
    };
  }

  async createMission(data) {
    return await missionRepository.create(data);
  }

  async getMissions(query) {
    const { page = 1, limit = 10, status, type, code } = query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (code) filter.code = { $regex: code, $options: "i" };

    return await missionRepository.findAll(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  async getMissionById(id) {
    const mission = await missionRepository.findById(id);
    if (!mission) {
      const error = new Error("Mission not found");
      error.statusCode = 404;
      throw error;
    }
    return mission;
  }

  async updateMission(id, data) {
    const mission = await missionRepository.findById(id);
    if (!mission) {
      const error = new Error("Mission not found");
      error.statusCode = 404;
      throw error;
    }

    // Block status update via generic update — use dedicated actions instead
    if (data.status) {
      const error = new Error(
        "Cannot update status directly. Use /pause, /resume, /abort actions instead",
      );
      error.statusCode = 400;
      throw error;
    }

    return await missionRepository.update(id, data);
  }

  async assignTeam(id, { teamId, requestId, note }) {
    const mission = await missionRepository.findById(id);
    if (!mission) {
      const error = new Error("Mission not found");
      error.statusCode = 404;
      throw error;
    }

    if (["COMPLETED", "ABORTED", "PAUSED"].includes(mission.status)) {
      const error = new Error(
        `Cannot assign team to a mission with status ${mission.status}`,
      );
      error.statusCode = 400;
      throw error;
    }

    const [request, team] = await Promise.all([
      requestRepository.findRequestById(requestId),
      teamRepository.findById(teamId),
    ]);

    if (!request) {
      const error = new Error("Request not found");
      error.statusCode = 404;
      throw error;
    }

    if (
      ![REQUEST_STATUS.VERIFIED, REQUEST_STATUS.PARTIALLY_FULFILLED].includes(
        request.status,
      )
    ) {
      const error = new Error(
        `Cannot assign request with status ${request.status}. Allowed: VERIFIED, PARTIALLY_FULFILLED`,
      );
      error.statusCode = 400;
      throw error;
    }

    if (!team) {
      const error = new Error("Team not found");
      error.statusCode = 404;
      throw error;
    }

    // If mission already has timelines, prevent mixing requests in same mission.
    const missionTimelines = await Timeline.find({ missionId: id }).lean();
    if (
      missionTimelines.length > 0 &&
      !missionTimelines.some((t) => t.requestId.toString() === requestId)
    ) {
      const error = new Error(
        "This mission is already bound to another request. Please create a new mission for this request.",
      );
      error.statusCode = 400;
      throw error;
    }

    // Create Timeline
    const timeline = await timelineService.createTimeline({
      missionId: id,
      teamId,
      requestId,
      status: "ASSIGNED",
      note,
    });

    // Emit assignment notification event.
    eventBus.emit("MISSION_ASSIGNED", {
      requestId,
      missionId: id,
      citizenId: request.userId?._id?.toString?.() || request.userId?.toString?.(),
      teamLeaderId: team.leaderId?._id?.toString?.() || team.leaderId?.toString?.(),
      teamName: team.name,
    });

    return timeline;
  }

  async pauseMission(id) {
    const mission = await missionRepository.findById(id);
    if (!mission) {
      const error = new Error("Mission not found");
      error.statusCode = 404;
      throw error;
    }
    if (mission.status !== "IN_PROGRESS") {
      const error = new Error("Only IN_PROGRESS missions can be paused");
      error.statusCode = 400;
      throw error;
    }

    return await missionRepository.update(id, { status: "PAUSED" });
  }

  async resumeMission(id) {
    const mission = await missionRepository.findById(id);
    if (!mission) {
      const error = new Error("Mission not found");
      error.statusCode = 404;
      throw error;
    }
    if (mission.status !== "PAUSED") {
      const error = new Error("Only PAUSED missions can be resumed");
      error.statusCode = 400;
      throw error;
    }

    return await missionRepository.update(id, { status: "IN_PROGRESS" });
  }

  async abortMission(id) {
    const mission = await missionRepository.findById(id);
    if (!mission) {
      const error = new Error("Mission not found");
      error.statusCode = 404;
      throw error;
    }
    if (["COMPLETED", "ABORTED"].includes(mission.status)) {
      const error = new Error("Mission is already closed");
      error.statusCode = 400;
      throw error;
    }

    const abortedPayload = await this.buildMissionAbortedPayload(id);

    await timelineService.cancelActiveTimelinesByMission(
      id,
      "Mission aborted by coordinator",
    );

    const updatedMission = await missionRepository.update(id, { status: "ABORTED" });

    eventBus.emit("MISSION_ABORTED", {
      ...abortedPayload,
      missionCode: updatedMission?.code || mission?.code,
    });

    return updatedMission;
  }

  async deleteMission(id) {
    const mission = await missionRepository.findById(id);
    if (!mission) {
      const error = new Error("Mission not found");
      error.statusCode = 404;
      throw error;
    }

    // Check for active timelines
    const activeTimelines = await Timeline.countDocuments({
      missionId: id,
      status: { $in: ["ASSIGNED", "EN_ROUTE", "ON_SITE"] },
    });

    if (activeTimelines > 0) {
      const error = new Error("Cannot delete mission with active timelines");
      error.statusCode = 400;
      throw error;
    }

    return await missionRepository.delete(id);
  }
}

export default new MissionService();
