import missionRepository from "./mission.repository.js";
import Timeline from "../timelines/timeline.model.js";
import timelineService from "../timelines/timeline.service.js";

class MissionService {
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

    // Create Timeline
    const timeline = await timelineService.createTimeline({
      missionId: id,
      teamId,
      requestId,
      status: "ASSIGNED",
      note,
    });

    // Update mission status to IN_PROGRESS if it was PLANNED
    if (mission.status === "PLANNED") {
      await missionRepository.update(id, { status: "IN_PROGRESS" });
    }

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

    // TODO: Cancel active timelines when Timeline module is fully implemented

    return await missionRepository.update(id, { status: "ABORTED" });
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
