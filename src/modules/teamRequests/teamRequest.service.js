import User from "../users/user.model.js";
import { teamRequestRepository } from "./teamRequest.repository.js";
import { missionRequestRepository } from "../missionRequests/missionRequest.repository.js";
import { timelineRepository } from "../timelines/timeline.repository.js";

class TeamRequestService {
  async getById(id, user = null) {
    const item = await teamRequestRepository.findById(id);
    if (!item) {
      const err = new Error("Team request not found");
      err.statusCode = 404;
      throw err;
    }

    if (user?.role === "Rescue Team") {
      const myTeamId = user.teamId || (await User.findById(user.id).select("teamId"))?.teamId;
      const itemTeamId = item.teamId?._id?.toString?.() || item.teamId?.toString?.();

      if (!myTeamId || myTeamId.toString() !== itemTeamId) {
        const err = new Error("Access denied");
        err.statusCode = 403;
        throw err;
      }
    }

    return item;
  }

  async getAll(query = {}, user = null) {
    const {
      missionId,
      missionRequestId,
      teamId,
      page = 1,
      limit = 10,
    } = query;

    const filter = {};
    if (missionId) filter.missionId = missionId;
    if (missionRequestId) filter.missionRequestId = missionRequestId;

    let resolvedTeamId = teamId;

    // Rescue Team only sees their own records
    if (user?.role === "Rescue Team") {
      resolvedTeamId = user.teamId || (await User.findById(user.id).select("teamId"))?.teamId;
    }

    if (resolvedTeamId) {
      filter.teamId = resolvedTeamId;
    }

    return await teamRequestRepository.findAll(
      filter,
      { page: parseInt(page), limit: parseInt(limit) },
      { lastUpdatedAt: -1, createdAt: -1 },
    );
  }

  async createMatrix(payload) {
    return await teamRequestRepository.createMatrix(payload);
  }

  async completeTeamRequest(id, payload = {}, user) {
    const { note } = payload;

    const teamRequest = await teamRequestRepository.findById(id);
    if (!teamRequest) {
      const err = new Error("Team request not found");
      err.statusCode = 404;
      err.errorCode = "TEAM_REQUEST_NOT_FOUND";
      throw err;
    }

    if (teamRequest.completedAt) {
      const err = new Error("Team request already completed");
      err.statusCode = 400;
      err.errorCode = "TEAM_REQUEST_ALREADY_COMPLETED";
      throw err;
    }

    let teamId = null;
    if (user?.teamId) {
      teamId = user.teamId.toString();
    } else if (user?.id) {
      const userDoc = await User.findById(user.id).select("teamId");
      teamId = userDoc?.teamId?.toString() || null;
    }

    if (!teamId) {
      const err = new Error("Bạn chưa thuộc team nào.");
      err.statusCode = 403;
      err.errorCode = "USER_NOT_IN_TEAM";
      throw err;
    }

    const teamRequestTeamId = teamRequest.teamId?._id?.toString?.() || teamRequest.teamId?.toString?.();
    if (teamId !== teamRequestTeamId) {
      const err = new Error("Bạn không có quyền complete team request này.");
      err.statusCode = 403;
      err.errorCode = "TEAM_REQUEST_ACCESS_DENIED";
      throw err;
    }

    const missionId = teamRequest.missionId?._id?.toString?.() || teamRequest.missionId?.toString?.();

    const timeline = await timelineRepository.findOne({ missionId, teamId });
    if (!timeline) {
      const err = new Error("Team chưa được assign vào mission này.");
      err.statusCode = 400;
      err.errorCode = "TEAM_NOT_ASSIGNED_TO_MISSION";
      throw err;
    }

    if (timeline.status !== "ON_SITE") {
      const err = new Error(
        `Team phải ở trạng thái ON_SITE mới có thể complete. Trạng thái hiện tại: ${timeline.status}`,
      );
      err.statusCode = 400;
      err.errorCode = "TIMELINE_NOT_ON_SITE";
      throw err;
    }

    const missionRequestId = teamRequest.missionRequestId?._id?.toString?.() || teamRequest.missionRequestId?.toString?.();
    const missionRequest = await missionRequestRepository.findById(missionRequestId);
    if (!missionRequest) {
      const err = new Error("Mission request not found");
      err.statusCode = 404;
      err.errorCode = "MISSION_REQUEST_NOT_FOUND";
      throw err;
    }

    const requestId = missionRequest.requestId?._id?.toString?.() || missionRequest.requestId?.toString?.();
    const RequestModel = (await import("../requests/request.model.js")).default;
    const request = await RequestModel.findById(requestId);
    if (!request) {
      const err = new Error("Request not found");
      err.statusCode = 404;
      err.errorCode = "REQUEST_NOT_FOUND";
      throw err;
    }

    const peopleNeeded = request.peopleNeeded || 0;
    const rescuedCountTotal = teamRequest.rescuedCountTotal || 0;

    const outcome = rescuedCountTotal >= peopleNeeded ? "COMPLETED" : "PARTIAL";

    const completed = await teamRequestRepository.markComplete(id, {
      outcome,
      note: note || null,
      completedBy: user?.id || null,
    });

    const incompleteCount = await teamRequestRepository.countIncompleteByMissionAndTeam(
      missionId,
      teamId,
    );

    if (incompleteCount === 0) {
      const completedTeamRequests = await teamRequestRepository.findCompletedByMissionAndTeam(
        missionId,
        teamId,
      );

      const hasAnyPartial = completedTeamRequests.some((tr) => tr.outcome === "PARTIAL");
      const timelineOutcome = hasAnyPartial ? "PARTIAL" : "COMPLETED";

      const TimelineService = (await import("../timelines/timeline.service.js")).default;
      await TimelineService.completeTimelineFromTeamRequest(
        timeline._id.toString(),
        timelineOutcome,
        note || `Auto-completed from TeamRequest (${timelineOutcome})`,
        user?.id || null,
      );
    }

    const MissionRequestService = (await import("../missionRequests/missionRequest.service.js")).default;
    await MissionRequestService.syncAfterMissionRequestUpdate(missionRequest);

    return completed;
  }
}

const teamRequestService = new TeamRequestService();

export { teamRequestService };
