import missionRepository from "./mission.repository.js";
import Timeline from "../timelines/timeline.model.js";
import timelineService from "../timelines/timeline.service.js";
import { requestRepository } from "../requests/request.repository.js";
import { REQUEST_STATUS } from "../requests/request.model.js";
import { teamRepository } from "../teams/team.repository.js";
import { missionRequestRepository } from "../missionRequests/missionRequest.repository.js";
import missionRequestService from "../missionRequests/missionRequest.service.js";
import { eventBus } from "../../utils/events.js";
import User from "../users/user.model.js";
import { teamRequestService } from "../teamRequests/teamRequest.service.js";
import Supply from "../supply/supply.model.js";
import MissionSupply from "../missionSupplies/missionSupply.model.js";

class MissionService {
  async buildMissionMetrics(missionId) {
    const missionRequests = await missionRequestRepository.findByMissionId(missionId);
    const requestIds = [
      ...new Set(
        missionRequests
          .map((item) => item.requestId?._id?.toString?.() || item.requestId?.toString?.())
          .filter(Boolean),
      ),
    ];

    if (requestIds.length === 0) {
      return {
        peopleCount: 0,
        totalSupply: 0,
      };
    }

    const requests = await Promise.all(
      requestIds.map((requestId) => requestRepository.findRequestById(requestId)),
    );

    const peopleCount = requests.reduce(
      (sum, request) => sum + (Number(request?.peopleCount) || 0),
      0,
    );

    const totalSupply = requests.reduce((sum, request) => {
      const requestSupplies = Array.isArray(request?.requestSupplies)
        ? request.requestSupplies
        : [];
      const requestSupplyTotal = requestSupplies.reduce(
        (subTotal, item) => subTotal + (Number(item?.requestedQty) || 0),
        0,
      );
      return sum + requestSupplyTotal;
    }, 0);

    return {
      peopleCount,
      totalSupply,
    };
  }

  async assertRescueTeamCanAccessMission(missionId, user) {
    if (!user || user.role !== "Rescue Team") return;

    const resolvedTeamId =
      user.teamId || (await User.findById(user.id).select("teamId"))?.teamId;

    const hasAssignment =
      resolvedTeamId &&
      (await Timeline.exists({
        missionId,
        teamId: resolvedTeamId,
      }));

    if (!hasAssignment) {
      const error = new Error("Mission này không được gán cho team của bạn.");
      error.statusCode = 403;
      error.errorCode = "MISSION_NOT_ASSIGNED_TO_TEAM";
      throw error;
    }
  }

  async assertMissionExists(id) {
    const mission = await missionRepository.findById(id);
    if (!mission) {
      const error = new Error(`Không tìm thấy mission với ID: ${id}`);
      error.statusCode = 404;
      error.errorCode = "MISSION_NOT_FOUND";
      throw error;
    }
    return mission;
  }

  assertMissionDraft(mission, action = "perform this action") {
    if (mission.status !== "DRAFT") {
      const error = new Error(
        `Không thể ${action}: mission đang ở trạng thái ${mission.status}, yêu cầu DRAFT`,
      );
      error.statusCode = 400;
      error.errorCode = "INVALID_MISSION_STATUS";
      throw error;
    }
  }

  async buildMissionAbortedPayload(missionId) {
    const [activeTimelines, missionRequests] = await Promise.all([
      Timeline.find({
      missionId,
      status: { $in: ["ASSIGNED", "EN_ROUTE", "ON_SITE"] },
    })
        .populate("teamId"),
      missionRequestRepository.findByMissionId(missionId),
    ]);

    const requestIds = [
      ...new Set(
        missionRequests
          .map((missionRequest) => missionRequest.requestId?._id?.toString?.() || missionRequest.requestId?.toString?.())
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
      teamIds,
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

  async getMissionById(id, user) {
    const mission = await this.assertMissionExists(id);
    await this.assertRescueTeamCanAccessMission(mission._id, user);

    const missionMetrics = await this.buildMissionMetrics(id);

    return {
      ...(mission.toObject ? mission.toObject() : mission),
      ...missionMetrics,
    };
  }

  async getMissionRequests(id, query = {}, user = null) {
    await this.assertMissionExists(id);
    await this.assertRescueTeamCanAccessMission(id, user);

    const { teamId, page = 1, limit = 10 } = query;

    if (teamId) {
      // Kiểm tra team này có Timeline trong mission không
      const hasAssignment = await Timeline.exists({ missionId: id, teamId });
      if (!hasAssignment) {
        const error = new Error("Team này không được assign vào mission.");
        error.statusCode = 403;
        error.errorCode = "TEAM_NOT_ASSIGNED_TO_MISSION";
        throw error;
      }
    }

    return await missionRequestRepository.findByMissionIdPaginated(id, {
      teamId: teamId || null,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  async updateMission(id, data) {
    const mission = await this.assertMissionExists(id);

    // Block status update via generic update — use dedicated actions instead
    if (data.status) {
      const error = new Error(
        "Không thể cập nhật trực tiếp status. Hãy dùng các action /pause, /resume hoặc /abort",
      );
      error.statusCode = 400;
      error.errorCode = "STATUS_UPDATE_BLOCKED";
      throw error;
    }

    return await missionRepository.update(id, data);
  }

  async addRequestsToMission(id, { requestIds, note }) {
    const mission = await this.assertMissionExists(id);
    this.assertMissionDraft(mission, "add requests");

    const uniqueRequestIds = [...new Set(requestIds)];
    const created = [];

    for (const requestId of uniqueRequestIds) {
      const [request, existing] = await Promise.all([
        requestRepository.findRequestById(requestId),
        missionRequestRepository.findByMissionAndRequest(id, requestId),
      ]);

      if (!request) {
        const error = new Error(`Không tìm thấy request với ID: ${requestId}`);
        error.statusCode = 404;
        error.errorCode = "REQUEST_NOT_FOUND";
        throw error;
      }

      if (
        ![
          REQUEST_STATUS.VERIFIED,
          REQUEST_STATUS.IN_PROGRESS,
          REQUEST_STATUS.PARTIALLY_FULFILLED,
        ].includes(request.status)
      ) {
        const error = new Error(
          `Không thể thêm request có trạng thái ${request.status}. Chỉ chấp nhận: VERIFIED, IN_PROGRESS, PARTIALLY_FULFILLED`,
        );
        error.statusCode = 400;
        error.errorCode = "INVALID_REQUEST_STATUS";
        throw error;
      }

      if (existing) continue;

      created.push(
        await missionRequestRepository.create({
          missionId: id,
          requestId,
          status: "PENDING",
          peopleNeeded: request.peopleCount || 0,
          peopleRescued: 0,
          peopleRemaining: request.peopleCount || 0,
          requestSuppliesSnapshot: request.requestSupplies || [],
          note: note || null,
        }),
      );
    }

    return created;
  }

  async assignTeamsToMission(id, { teamIds, note }) {
    const mission = await this.assertMissionExists(id);
    this.assertMissionDraft(mission, "assign teams");

    const uniqueTeamIds = [...new Set(teamIds)];
    const created = [];

    for (const teamId of uniqueTeamIds) {
      const team = await teamRepository.findById(teamId);
      if (!team) {
        const error = new Error(`Không tìm thấy đội cứu hộ với ID: ${teamId}`);
        error.statusCode = 404;
        error.errorCode = "TEAM_NOT_FOUND";
        throw error;
      }

      created.push(
        await timelineService.createTimeline({
          missionId: id,
          teamId,
          status: "PLANNED",
          note,
        }),
      );
    }

    return created;
  }

  async removeRequestFromMission(id, requestId) {
    const mission = await this.assertMissionExists(id);
    this.assertMissionDraft(mission, "remove request");

    const missionRequest = await missionRequestRepository.findByMissionAndRequest(
      id,
      requestId,
    );

    if (!missionRequest) {
      const error = new Error(
        `Không tìm thấy liên kết request ${requestId} trong mission ${id}`,
      );
      error.statusCode = 404;
      error.errorCode = "MISSION_REQUEST_NOT_FOUND";
      throw error;
    }

    if (missionRequest.status !== "PENDING") {
      const error = new Error(
        `Không thể xoá request khỏi mission: trạng thái hiện tại là ${missionRequest.status}, yêu cầu PENDING`,
      );
      error.statusCode = 400;
      error.errorCode = "INVALID_MISSION_REQUEST_STATUS_FOR_REMOVE";
      throw error;
    }

    const result = await missionRequestRepository.deleteByMissionAndRequest(id, requestId);
    if (!result?.deletedCount) {
      const error = new Error(
        `Không tìm thấy liên kết request ${requestId} trong mission ${id}`,
      );
      error.statusCode = 404;
      error.errorCode = "MISSION_REQUEST_NOT_FOUND";
      throw error;
    }

    await timelineService.syncRequestStatus(requestId);
    await timelineService.syncMissionStatus(id);

    return {
      missionId: id,
      requestId,
      removed: true,
    };
  }

  async removeTeamFromMission(id, teamId) {
    const mission = await this.assertMissionExists(id);
    this.assertMissionDraft(mission, "remove team");

    const timeline = await Timeline.findOne({ missionId: id, teamId });
    if (!timeline) {
      const error = new Error(
        `Không tìm thấy liên kết team ${teamId} trong mission ${id}`,
      );
      error.statusCode = 404;
      error.errorCode = "TIMELINE_NOT_FOUND";
      throw error;
    }

    if (!["PLANNED", "ASSIGNED"].includes(timeline.status)) {
      const error = new Error(
        `Không thể xoá team khỏi mission: timeline đang ở trạng thái ${timeline.status}, yêu cầu PLANNED hoặc ASSIGNED`,
      );
      error.statusCode = 400;
      error.errorCode = "INVALID_TIMELINE_STATUS_FOR_REMOVE";
      throw error;
    }

    const result = await Timeline.deleteOne({ missionId: id, teamId });
    if (!result?.deletedCount) {
      const error = new Error(
        `Không tìm thấy liên kết team ${teamId} trong mission ${id}`,
      );
      error.statusCode = 404;
      error.errorCode = "TIMELINE_NOT_FOUND";
      throw error;
    }

    await timelineService.syncMissionStatus(id);
    await timelineService.syncTeamStatus(teamId);

    return {
      missionId: id,
      teamId,
      removed: true,
    };
  }

  async startMission(id, userId) {
    const mission = await this.assertMissionExists(id);
    this.assertMissionDraft(mission, "start mission");

    const missionRequests = await missionRequestRepository.findByMissionId(id);
    if (missionRequests.length === 0) {
      const error = new Error(
        "Cannot start mission without requests",
      );
      error.statusCode = 400;
      error.errorCode = "NO_MISSION_REQUESTS";
      throw error;
    }

    const plannedTimelines = await Timeline.find({
      missionId: id,
      status: "PLANNED",
    }).populate("teamId");

    if (plannedTimelines.length === 0) {
      const error = new Error(
        "Không thể bắt đầu mission: chưa có timeline ở trạng thái PLANNED",
      );
      error.statusCode = 400;
      error.errorCode = "NO_PLANNED_TIMELINES";
      throw error;
    }

    await Timeline.updateMany(
      {
        missionId: id,
        status: "PLANNED",
      },
      {
        $set: {
          status: "ASSIGNED",
          assignedAt: new Date(),
        },
      },
    );

    // Pre-create TeamRequest matrix: every team × every missionRequest (Option A)
    const missionRequestIds = missionRequests
      .map((item) => item._id?.toString?.() || item._id)
      .filter(Boolean);
    const assignedTeamIds = plannedTimelines
      .map((tl) => tl.teamId?._id?.toString?.() || tl.teamId?.toString?.())
      .filter(Boolean);
    await teamRequestService.createMatrix({
      missionId: id,
      missionRequestIds,
      teamIds: assignedTeamIds,
    });

    // Auto-create MissionSupply for each request
    for (const mr of missionRequests) {
      await missionRequestService.createSupplyRequirement(mr, userId);
    }

    const updatedMission = await missionRepository.update(id, { status: "PLANNED" });

    const requestIds = [
      ...new Set(
        missionRequests
          .map((item) => item.requestId?._id?.toString?.() || item.requestId?.toString?.())
          .filter(Boolean),
      ),
    ];
    const citizenIds = [
      ...new Set(
        missionRequests
          .map((item) => item.requestId?.userId?._id?.toString?.() || item.requestId?.userId?.toString?.())
          .filter(Boolean),
      ),
    ];
    const teamLeaderIds = [
      ...new Set(
        plannedTimelines
          .map((timeline) => timeline.teamId?.leaderId?._id?.toString?.() || timeline.teamId?.leaderId?.toString?.())
          .filter(Boolean),
      ),
    ];
    const teamNames = [
      ...new Set(plannedTimelines.map((timeline) => timeline.teamId?.name).filter(Boolean)),
    ];

    eventBus.emit("MISSION_ASSIGNED", {
      missionId: id,
      missionCode: updatedMission?.code || mission?.code,
      requestIds,
      citizenIds,
      teamIds: assignedTeamIds,
      teamLeaderIds,
      teamNames,
    });

    return updatedMission;
  }

  async pauseMission(id) {
    const mission = await this.assertMissionExists(id);
    if (mission.status !== "IN_PROGRESS") {
      const error = new Error(
        `Không thể tạm dừng mission: trạng thái hiện tại là ${mission.status}, yêu cầu IN_PROGRESS`,
      );
      error.statusCode = 400;
      error.errorCode = "INVALID_MISSION_STATE_FOR_PAUSE";
      throw error;
    }

    return await missionRepository.update(id, { status: "PAUSED" });
  }

  async resumeMission(id) {
    const mission = await this.assertMissionExists(id);
    if (mission.status !== "PAUSED") {
      const error = new Error(
        `Không thể tiếp tục mission: trạng thái hiện tại là ${mission.status}, yêu cầu PAUSED`,
      );
      error.statusCode = 400;
      error.errorCode = "INVALID_MISSION_STATE_FOR_RESUME";
      throw error;
    }

    return await missionRepository.update(id, { status: "IN_PROGRESS" });
  }

  async abortMission(id) {
    const mission = await this.assertMissionExists(id);
    if (["COMPLETED", "ABORTED"].includes(mission.status)) {
      const error = new Error(
        `Không thể huỷ mission: mission đang ở trạng thái kết thúc ${mission.status}`,
      );
      error.statusCode = 400;
      error.errorCode = "MISSION_TERMINAL";
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
    await this.assertMissionExists(id);

    // Check for active timelines
    const activeTimelines = await Timeline.countDocuments({
      missionId: id,
      status: { $in: ["ASSIGNED", "EN_ROUTE", "ON_SITE"] },
    });

    if (activeTimelines > 0) {
      const error = new Error(
        `Không thể xoá mission: còn ${activeTimelines} timeline đang hoạt động`,
      );
      error.statusCode = 400;
      error.errorCode = "ACTIVE_TIMELINES_EXIST";
      throw error;
    }

    return await missionRepository.delete(id);
  }
}

export default new MissionService();
