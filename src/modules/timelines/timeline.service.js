import mongoose from "mongoose";
import { eventBus } from "../../utils/events.js";
import missionRepository from "../missions/mission.repository.js";
import { missionRequestRepository } from "../missionRequests/missionRequest.repository.js";
import { requestRepository } from "../requests/request.repository.js";
import { REQUEST_STATUS } from "../requests/request.model.js";
import { TEAM_STATUS } from "../teams/team.model.js";
import { teamRepository } from "../teams/team.repository.js";
import User from "../users/user.model.js";
import { TIMELINE_STATUS } from "./timeline.model.js";
import {
  timelineRepository,
  ACTIVE_TIMELINE_STATUSES,
  EXECUTING_TIMELINE_STATUSES,
  TERMINAL_TIMELINE_STATUSES,
} from "./timeline.repository.js";

const TIMELINE_TRANSITIONS = {
  [TIMELINE_STATUS.PLANNED]: [TIMELINE_STATUS.ASSIGNED, TIMELINE_STATUS.CANCELLED],
  [TIMELINE_STATUS.ASSIGNED]: [
    TIMELINE_STATUS.CLAIMING_SUPPLIES,
    TIMELINE_STATUS.WITHDRAWN,
    TIMELINE_STATUS.CANCELLED,
  ],
  [TIMELINE_STATUS.CLAIMING_SUPPLIES]: [TIMELINE_STATUS.EN_ROUTE],
  [TIMELINE_STATUS.EN_ROUTE]: [TIMELINE_STATUS.ON_SITE],
  [TIMELINE_STATUS.ON_SITE]: [
    TIMELINE_STATUS.COMPLETED,
    TIMELINE_STATUS.PARTIAL,
    TIMELINE_STATUS.FAILED,
  ],
  [TIMELINE_STATUS.COMPLETED]: [],
  [TIMELINE_STATUS.PARTIAL]: [],
  [TIMELINE_STATUS.FAILED]: [],
  [TIMELINE_STATUS.WITHDRAWN]: [],
  [TIMELINE_STATUS.CANCELLED]: [],
};

function assertTimelineTransition(currentStatus, nextStatus) {
  const allowed = TIMELINE_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    const err = new Error(
      `Chuyển trạng thái timeline không hợp lệ: ${currentStatus} -> ${nextStatus}`,
    );
    err.statusCode = 400;
    err.errorCode = "INVALID_TIMELINE_TRANSITION";
    throw err;
  }
}

function extractId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id?.toString?.() || value.toString();
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

class TimelineService {
  async createTimeline(data) {
    const timeline = await timelineRepository.create(data);
    await this.syncTeamStatus(extractId(timeline.teamId));
    return await timelineRepository.findById(extractId(timeline._id));
  }

  async getTimelineById(timelineId) {
    const timeline = await timelineRepository.findById(timelineId);
    if (!timeline) {
      const err = new Error(`Không tìm thấy timeline với ID: ${timelineId}`);
      err.statusCode = 404;
      err.errorCode = "TIMELINE_NOT_FOUND";
      throw err;
    }
    return timeline;
  }

  async getTimelines(query = {}, user = null) {
    const { page = 1, limit = 10, missionId, teamId, status } = query;
    const filter = {};

    if (missionId) {
      if (!isObjectId(missionId)) {
        const err = new Error("missionId phải là ObjectId hợp lệ");
        err.statusCode = 400;
        err.errorCode = "INVALID_OBJECTID_MISSION";
        throw err;
      }
      filter.missionId = missionId;
    }

    if (teamId) {
      if (!isObjectId(teamId)) {
        const err = new Error("teamId phải là ObjectId hợp lệ");
        err.statusCode = 400;
        err.errorCode = "INVALID_OBJECTID_TEAM";
        throw err;
      }
      filter.teamId = teamId;
    }

    if (status) {
      filter.status = status;
    }

    // Rescue Team can only see their own timelines.
    if (user?.role === "Rescue Team") {
      const team = await this.getUserTeamId(user.id);
      if (!team) {
        return { data: [], total: 0, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: 0 };
      }
      filter.teamId = team;
    }

    return await timelineRepository.findAll(filter, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  async acceptTimeline(timelineId, actorUserId, payload = {}) {
    const { warehouseId } = payload;
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionCanExecute(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.CLAIMING_SUPPLIES);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ASSIGNED,
      {
        status: TIMELINE_STATUS.CLAIMING_SUPPLIES,
        startedAt: new Date(),
      },
    );

    if (!transitioned) {
      const err = new Error(
        "Timeline đã được cập nhật bởi thao tác khác. Vui lòng tải lại dữ liệu và thử lại",
      );
      err.statusCode = 409;
      err.errorCode = "TIMELINE_CONFLICT";
      throw err;
    }

    // Create combo supply request records for the manager to approve
    const missionId = extractId(transitioned.missionId);
    const teamId = extractId(transitioned.teamId);

    try {
      const mission = await missionRepository.findById(missionId);
      if (mission?.comboSupplyId) {
        const { comboSupplyRepository } = await import("../comboSupply/comboSupply.repository.js");
        const { missionSupplyService } = await import("../missionSupplies/missionSupply.service.js");
        const comboSupply = await comboSupplyRepository.findById(mission.comboSupplyId.toString());
        if (comboSupply) {
          await missionSupplyService.createComboSupplyRequest({
            missionId,
            teamId,
            comboSupply,
            warehouseId: warehouseId || null,
            createdBy: actorUserId,
          });
        }
      }
    } catch (comboErr) {
      // Non-blocking: log but don't fail the accept
      console.error("[acceptTimeline] Combo supply creation error:", comboErr.message);
    }

    await missionRequestRepository.markPendingInProgressByMission(
      extractId(transitioned.missionId),
    );
    await this.syncAllForTimeline(transitioned);
    await this.syncRequestStatusesForMission(extractId(transitioned.missionId));
    await this.emitMissionAcceptedForMission(transitioned, actorUserId);

    return transitioned;
  }

  async confirmSupplyClaim(timelineId, actorUserId, payload = {}) {
    const { note } = payload;
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionNotTerminated(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.EN_ROUTE);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.CLAIMING_SUPPLIES,
      {
        status: TIMELINE_STATUS.EN_ROUTE,
        note: note || timeline.note,
      },
    );

    if (!transitioned) {
      const err = new Error(
        "Timeline đã được cập nhật bởi thao tác khác. Vui lòng tải lại dữ liệu và thử lại",
      );
      err.statusCode = 409;
      err.errorCode = "TIMELINE_CONFLICT";
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    await this.emitMissionApproachingForMission(transitioned);

    return transitioned;
  }

  async arriveTimeline(timelineId, actorUserId) {
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionNotTerminated(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.ON_SITE);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.EN_ROUTE,
      {
        status: TIMELINE_STATUS.ON_SITE,
        arrivedAt: new Date(),
      },
    );

    if (!transitioned) {
      const err = new Error(
        "Timeline đã được cập nhật bởi thao tác khác. Vui lòng tải lại dữ liệu và thử lại",
      );
      err.statusCode = 409;
      err.errorCode = "TIMELINE_CONFLICT";
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    await this.syncRequestStatusesForMission(extractId(transitioned.missionId));
    return transitioned;
  }

  async completeTimeline(timelineId, actorUserId, payload) {
    const { outcome, note } = payload;
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionNotTerminated(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);

    const nextStatus =
      outcome === TIMELINE_STATUS.PARTIAL ?
        TIMELINE_STATUS.PARTIAL
      : TIMELINE_STATUS.COMPLETED;

    assertTimelineTransition(timeline.status, nextStatus);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ON_SITE,
      {
        status: nextStatus,
        completedAt: new Date(),
        note: note || timeline.note,
      },
    );

    if (!transitioned) {
      const err = new Error(
        "Timeline đã được cập nhật bởi thao tác khác. Vui lòng tải lại dữ liệu và thử lại",
      );
      err.statusCode = 409;
      err.errorCode = "TIMELINE_CONFLICT";
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    await this.syncRequestStatusesForMission(extractId(transitioned.missionId));

    if (nextStatus === TIMELINE_STATUS.COMPLETED) {
      await this.emitMissionCompletedForMission(
        transitioned,
        "completed via timeline",
        actorUserId,
      );
    }

    return transitioned;
  }

  async completeTimelineFromTeamRequest(timelineId, outcome, note, actorUserId) {
    const timeline = await this.getTimelineById(timelineId);

    const nextStatus =
      outcome === "PARTIAL" ? TIMELINE_STATUS.PARTIAL : TIMELINE_STATUS.COMPLETED;

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ON_SITE,
      {
        status: nextStatus,
        completedAt: new Date(),
        note: note || timeline.note,
      },
    );

    if (!transitioned) {
      const err = new Error(
        "Timeline đã được cập nhật bởi thao tác khác. Vui lòng tải lại dữ liệu và thử lại",
      );
      err.statusCode = 409;
      err.errorCode = "TIMELINE_CONFLICT";
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    await this.syncRequestStatusesForMission(extractId(transitioned.missionId));

    if (nextStatus === TIMELINE_STATUS.COMPLETED) {
      await this.emitMissionCompletedForMission(
        transitioned,
        "completed via TeamRequest",
        actorUserId,
      );
    }

    return transitioned;
  }

  async completeTimelineFromAllTeamRequests(timelineId, actorUserId, payload = {}) {
    const { note } = payload;
    const timeline = await this.getTimelineById(timelineId);

    if (timeline.status !== TIMELINE_STATUS.ON_SITE) {
      const err = new Error(
        `Timeline phải ở trạng thái ON_SITE mới có thể complete. Trạng thái hiện tại: ${timeline.status}`,
      );
      err.statusCode = 400;
      err.errorCode = "TIMELINE_NOT_ON_SITE";
      throw err;
    }

    await this.assertTeamActionAllowed(timeline, actorUserId);

    const missionId = extractId(timeline.missionId);
    const teamId = extractId(timeline.teamId);

    const { teamRequestRepository } = await import("../teamRequests/teamRequest.repository.js");

    const incompleteCount = await teamRequestRepository.countIncompleteByMissionAndTeam(
      missionId,
      teamId,
    );

    if (incompleteCount > 0) {
      const err = new Error(
        `Không thể hoàn tất timeline: còn ${incompleteCount} TeamRequest chưa hoàn thành`,
      );
      err.statusCode = 400;
      err.errorCode = "INCOMPLETE_TEAM_REQUESTS_REMAINING";
      throw err;
    }

    const completedTeamRequests = await teamRequestRepository.findCompletedByMissionAndTeam(
      missionId,
      teamId,
    );

    if (completedTeamRequests.length === 0) {
      const err = new Error(
        "Không tìm thấy TeamRequest nào cho team này trong mission",
      );
      err.statusCode = 404;
      err.errorCode = "NO_TEAM_REQUESTS_FOUND";
      throw err;
    }

    const hasAnyPartial = completedTeamRequests.some((tr) => tr.outcome === "PARTIAL");
    const timelineOutcome = hasAnyPartial ? "PARTIAL" : "COMPLETED";

    return await this.completeTimelineFromTeamRequest(
      timelineId,
      timelineOutcome,
      note || `Manually completed from all TeamRequests (${timelineOutcome})`,
      actorUserId,
    );
  }

  async completeTimelineAuto(timelineId, actorUserId, payload = {}) {
    const { note } = payload;
    const timeline = await this.getTimelineById(timelineId);

    const terminalStatuses = [
      TIMELINE_STATUS.COMPLETED,
      TIMELINE_STATUS.PARTIAL,
      TIMELINE_STATUS.FAILED,
      TIMELINE_STATUS.WITHDRAWN,
      TIMELINE_STATUS.CANCELLED,
    ];

    if (terminalStatuses.includes(timeline.status)) {
      return {
        ...timeline.toObject(),
        _alreadyCompleted: true,
        message: "Timeline đã được hoàn tất trước đó",
      };
    }

    if (timeline.status !== TIMELINE_STATUS.ON_SITE) {
      const err = new Error(
        `Timeline phải ở trạng thái ON_SITE mới có thể complete. Trạng thái hiện tại: ${timeline.status}`,
      );
      err.statusCode = 400;
      err.errorCode = "TIMELINE_NOT_ON_SITE";
      throw err;
    }

    await this.assertTeamActionAllowed(timeline, actorUserId);
    await this.assertMissionNotTerminated(extractId(timeline.missionId));

    const missionId = extractId(timeline.missionId);
    const teamId = extractId(timeline.teamId);

    const { teamRequestRepository } = await import("../teamRequests/teamRequest.repository.js");

    const allTeamRequests = await teamRequestRepository.findByMissionAndTeam(missionId, teamId);

    if (allTeamRequests.length === 0) {
      const err = new Error(
        "Không thể complete timeline khi mission chưa start (chưa có TeamRequest)",
      );
      err.statusCode = 400;
      err.errorCode = "NO_TEAM_REQUESTS_FOUND";
      throw err;
    }

    // Auto-complete all incomplete teamRequests based on their actual progress
    const RequestModel = (await import("../requests/request.model.js")).default;
    for (const tr of allTeamRequests) {
      if (tr.completedAt) continue; // already completed

      const trId = tr._id?.toString?.();
      const missionRequestId = tr.missionRequestId?._id?.toString?.() || tr.missionRequestId?.toString?.();
      const missionRequest = missionRequestId
        ? await missionRequestRepository.findById(missionRequestId)
        : null;

      let trOutcome = "PARTIAL";
      if (missionRequest) {
        const requestId = missionRequest.requestId?._id?.toString?.() || missionRequest.requestId?.toString?.();
        const request = requestId ? await RequestModel.findById(requestId) : null;
        const peopleNeeded = request?.peopleNeeded || 0;
        const rescuedCountTotal = tr.rescuedCountTotal || 0;

        const hasProgress = rescuedCountTotal > 0 || (tr.suppliesDeliveredTotal && tr.suppliesDeliveredTotal.length > 0);
        if (!hasProgress) {
          trOutcome = "PARTIAL";
        } else {
          // For supplies-only requests (peopleNeeded = 0), check only supplies
          if (peopleNeeded === 0) {
            trOutcome = hasProgress ? "COMPLETED" : "PARTIAL";
          } else {
            trOutcome = rescuedCountTotal >= peopleNeeded ? "COMPLETED" : "PARTIAL";
          }
        }
      }

      await teamRequestRepository.markComplete(trId, {
        outcome: trOutcome,
        note: note || "Auto-completed when finishing mission",
        completedBy: actorUserId,
      });

      // Sync missionRequest aggregate
      if (missionRequest) {
        const MissionRequestService = (await import("../missionRequests/missionRequest.service.js")).default;
        await MissionRequestService.syncAfterMissionRequestUpdate(missionRequest);
      }
    }

    // Re-fetch completed teamRequests after auto-completing
    const completedTeamRequests = await teamRequestRepository.findCompletedByMissionAndTeam(
      missionId,
      teamId,
    );

    let outcome;
    let targetStatus;

    if (completedTeamRequests.length > 0) {
      const hasAnyPartial = completedTeamRequests.some((tr) => tr.outcome === "PARTIAL");
      outcome = hasAnyPartial ? "PARTIAL" : "COMPLETED";
      targetStatus = outcome === "PARTIAL" ? TIMELINE_STATUS.PARTIAL : TIMELINE_STATUS.COMPLETED;
    } else {
      outcome = "FAILED";
      targetStatus = TIMELINE_STATUS.FAILED;
    }

    if (targetStatus === TIMELINE_STATUS.FAILED) {
      return await this.failTimeline(timelineId, actorUserId, {
        failureReason: "Team kết thúc nhiệm vụ mà chưa hoàn thành yêu cầu nào",
        note: note || null,
      });
    } else {
      return await this.completeTimelineFromTeamRequest(
        timelineId,
        outcome,
        note || `Auto-calculated outcome from TeamRequests: ${outcome}`,
        actorUserId,
      );
    }
  }

  async failTimeline(timelineId, actorUserId, payload) {
    const { failureReason, note } = payload;
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionNotTerminated(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.FAILED);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ON_SITE,
      {
        status: TIMELINE_STATUS.FAILED,
        completedAt: new Date(),
        failureReason,
        note: note || timeline.note,
      },
    );

    if (!transitioned) {
      const err = new Error(
        "Timeline đã được cập nhật bởi thao tác khác. Vui lòng tải lại dữ liệu và thử lại",
      );
      err.statusCode = 409;
      err.errorCode = "TIMELINE_CONFLICT";
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    await this.syncRequestStatusesForMission(extractId(transitioned.missionId));
    await this.emitMissionFailedForMission(transitioned, failureReason, actorUserId);
    return transitioned;
  }

  async withdrawTimeline(timelineId, actorUserId, payload) {
    const { withdrawalReason, note } = payload;
    const timeline = await this.getTimelineById(timelineId);
    await this.assertMissionNotTerminated(extractId(timeline.missionId));
    await this.assertTeamActionAllowed(timeline, actorUserId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.WITHDRAWN);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ASSIGNED,
      {
        status: TIMELINE_STATUS.WITHDRAWN,
        completedAt: new Date(),
        withdrawalReason,
        note: note || timeline.note,
      },
    );

    if (!transitioned) {
      const err = new Error(
        "Timeline đã được cập nhật bởi thao tác khác. Vui lòng tải lại dữ liệu và thử lại",
      );
      err.statusCode = 409;
      err.errorCode = "TIMELINE_CONFLICT";
      throw err;
    }

    await this.emitMissionWithdrawnForMission(transitioned, actorUserId);
    await this.syncAllForTimeline(transitioned);
    await this.syncRequestStatusesForMission(extractId(transitioned.missionId));
    return transitioned;
  }

  async cancelTimeline(timelineId, payload = {}) {
    const { note } = payload;
    const timeline = await this.getTimelineById(timelineId);
    assertTimelineTransition(timeline.status, TIMELINE_STATUS.CANCELLED);

    const transitioned = await timelineRepository.transitionStatus(
      timelineId,
      TIMELINE_STATUS.ASSIGNED,
      {
        status: TIMELINE_STATUS.CANCELLED,
        completedAt: new Date(),
        note: note || timeline.note,
      },
    );

    if (!transitioned) {
      const err = new Error(
        "Timeline đã được cập nhật bởi thao tác khác. Vui lòng tải lại dữ liệu và thử lại",
      );
      err.statusCode = 409;
      err.errorCode = "TIMELINE_CONFLICT";
      throw err;
    }

    await this.syncAllForTimeline(transitioned);
    await this.syncRequestStatusesForMission(extractId(transitioned.missionId));
    return transitioned;
  }

  async cancelActiveTimelinesByMission(missionId, note = "Mission aborted") {
    const active = await timelineRepository.findActiveByMissionId(missionId);

    for (const item of active) {
      if (item.status === TIMELINE_STATUS.ASSIGNED) {
        await this.cancelTimeline(item._id.toString(), { note });
        continue;
      }

      const forced = await timelineRepository.updateById(item._id.toString(), {
        status: TIMELINE_STATUS.CANCELLED,
        completedAt: new Date(),
        note,
      });
      if (forced) {
        await this.syncAllForTimeline(forced);
      }
    }
  }

  async syncAllForTimeline(timeline) {
    const missionId = extractId(timeline.missionId);
    const teamId = extractId(timeline.teamId);

    const syncTasks = [
      this.syncMissionStatus(missionId),
      this.syncTeamStatus(teamId),
    ];
    syncTasks.unshift(Promise.resolve(null));

    const [requestStatus] = await Promise.all(syncTasks);

    return { requestStatus };
  }

  async syncRequestStatus(requestId) {
    if (!requestId) return null;

    const request = await requestRepository.findRequestById(requestId);
    if (!request) return null;

    if (
      [REQUEST_STATUS.CLOSED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.REJECTED].includes(
        request.status,
      )
    ) {
      return request.status;
    }

    const missionRequests = await missionRequestRepository.findByRequestId(requestId);
    const missionRequestStatuses = missionRequests.map((item) => item.status);

    if (missionRequestStatuses.length > 0) {
      let desiredFromMissionRequest = request.status;

      const hasNonTerminal = missionRequestStatuses.some((status) =>
        ["PENDING", "IN_PROGRESS"].includes(status),
      );
      if (hasNonTerminal) {
        desiredFromMissionRequest = REQUEST_STATUS.IN_PROGRESS;
      } else {
        const allDone = missionRequestStatuses.every((status) =>
          ["FULFILLED", "CLOSED", "DROPPED", "PARTIAL"].includes(status),
        );
        if (allDone) {
          const allFulfilled = missionRequestStatuses.every(
            (status) => status === "FULFILLED",
          );
          desiredFromMissionRequest = allFulfilled
            ? REQUEST_STATUS.FULFILLED
            : REQUEST_STATUS.PARTIALLY_FULFILLED;
        } else {
          desiredFromMissionRequest = REQUEST_STATUS.VERIFIED;
        }
      }

      if (desiredFromMissionRequest !== request.status) {
        await requestRepository.updateRequestStatus(requestId, desiredFromMissionRequest);
      }

      return desiredFromMissionRequest;
    }

    return request.status;
  }

  async syncRequestStatusesForMission(missionId) {
    const missionRequests = await missionRequestRepository.findByMissionId(missionId);
    const uniqueRequestIds = [
      ...new Set(
        missionRequests
          .map((item) => extractId(item.requestId))
          .filter(Boolean),
      ),
    ];

    await Promise.all(uniqueRequestIds.map((requestId) => this.syncRequestStatus(requestId)));
  }

  async syncMissionStatus(missionId) {
    const mission = await missionRepository.findById(missionId);
    if (!mission) return null;

    if (mission.status === "ABORTED" || mission.status === "PAUSED") {
      return mission.status;
    }

    const timelines = await timelineRepository.findByMissionId(missionId);
    if (timelines.length === 0) {
      if (mission.status !== "DRAFT") {
        await missionRepository.update(missionId, { status: "DRAFT" });
      }
      return "DRAFT";
    }

    const hasExecuting = timelines.some((t) =>
      EXECUTING_TIMELINE_STATUSES.includes(t.status),
    );
    if (hasExecuting) {
      if (mission.status !== "IN_PROGRESS") {
        await missionRepository.update(missionId, { status: "IN_PROGRESS" });
      }
      return "IN_PROGRESS";
    }

    const hasAssigned = timelines.some((t) => t.status === TIMELINE_STATUS.ASSIGNED);
    if (hasAssigned) {
      if (mission.status !== "PLANNED") {
        await missionRepository.update(missionId, { status: "PLANNED" });
      }
      return "PLANNED";
    }

    const hasPlanned = timelines.some((t) => t.status === TIMELINE_STATUS.PLANNED);
    if (hasPlanned) {
      if (mission.status !== "DRAFT") {
        await missionRepository.update(missionId, { status: "DRAFT" });
      }
      return "DRAFT";
    }

    const missionRequests = await missionRequestRepository.findByMissionId(missionId);
    const allFulfilled =
      missionRequests.length > 0 &&
      missionRequests.every((item) => ["FULFILLED", "CLOSED", "DROPPED"].includes(item.status));

    const desiredStatus = allFulfilled ? "COMPLETED" : "PARTIAL";
    if (mission.status !== desiredStatus) {
      await missionRepository.update(missionId, { status: desiredStatus });
    }

    return desiredStatus;
  }

  async syncTeamStatus(teamId) {
    const activeCount = await timelineRepository.countActiveByTeamId(teamId);
    const status = activeCount > 0 ? TEAM_STATUS.BUSY : TEAM_STATUS.AVAILABLE;
    await teamRepository.updateStatus(teamId, status);
    return status;
  }

  async assertMissionCanExecute(missionId) {
    const mission = await missionRepository.findById(missionId);
    if (!mission) {
      const err = new Error(`Không tìm thấy mission với ID: ${missionId}`);
      err.statusCode = 404;
      err.errorCode = "MISSION_NOT_FOUND";
      throw err;
    }

    if (["ABORTED", "COMPLETED", "PAUSED"].includes(mission.status)) {
      const err = new Error(
        `Không thể thao tác timeline: mission đang ở trạng thái ${mission.status}`,
      );
      err.statusCode = 400;
      err.errorCode = "MISSION_UNAVAILABLE_FOR_EXECUTION";
      throw err;
    }
  }

  // Used for arrive/complete/fail/withdraw.
  // Team actions are blocked when mission is paused or terminal.
  async assertMissionNotTerminated(missionId) {
    const mission = await missionRepository.findById(missionId);
    if (!mission) {
      const err = new Error(`Không tìm thấy mission với ID: ${missionId}`);
      err.statusCode = 404;
      err.errorCode = "MISSION_NOT_FOUND";
      throw err;
    }

    if (["ABORTED", "COMPLETED", "PAUSED"].includes(mission.status)) {
      const err = new Error(
        `Không thể thao tác timeline: mission đang ở trạng thái ${mission.status}`,
      );
      err.statusCode = 400;
      err.errorCode = "MISSION_UNAVAILABLE_FOR_EXECUTION";
      throw err;
    }
  }

  async getUserTeamId(userId) {
    const user = await User.findById(userId).select("teamId").lean();
    return user?.teamId?.toString?.() || null;
  }

  async assertTeamActionAllowed(timeline, actorUserId) {
    const actorTeamId = await this.getUserTeamId(actorUserId);
    if (!actorTeamId) {
      const err = new Error("Người dùng hiện tại chưa được gán vào đội cứu hộ nào");
      err.statusCode = 403;
      err.errorCode = "USER_NO_TEAM_ASSIGNMENT";
      throw err;
    }

    const timelineTeamId = extractId(timeline.teamId);
    if (actorTeamId !== timelineTeamId) {
      const err = new Error(
        `Không có quyền thao tác timeline này. Đội của bạn: ${actorTeamId}, đội được gán: ${timelineTeamId}`,
      );
      err.statusCode = 403;
      err.errorCode = "UNAUTHORIZED_TEAM_ACCESS";
      throw err;
    }
  }

  async emitMissionAcceptedForMission(timeline, actorUserId) {
    const missionRequests = await missionRequestRepository.findByMissionId(
      extractId(timeline.missionId),
    );
    const requestId = extractId(missionRequests[0]?.requestId) || null;

    eventBus.emit("MISSION_ACCEPTED", {
      requestId,
      missionId: extractId(timeline.missionId),
      teamId: extractId(timeline.teamId),
      actorUserId,
      teamName: timeline.teamId?.name || "Rescue Team",
    });
  }

  async emitMissionApproachingForMission(timeline) {
    const missionRequests = await missionRequestRepository.findByMissionId(
      extractId(timeline.missionId),
    );

    for (const missionRequest of missionRequests) {
      const requestId = extractId(missionRequest.requestId);
      const citizenId = extractId(missionRequest.requestId?.userId);
      if (!requestId || !citizenId) continue;

      eventBus.emit("MISSION_APPROACHING", {
        requestId,
        citizenId,
        teamName: timeline.teamId?.name || "Rescue Team",
      });
    }
  }

  async emitMissionFailedForMission(timeline, reason, actorUserId) {
    const missionRequests = await missionRequestRepository.findByMissionId(
      extractId(timeline.missionId),
    );

    for (const missionRequest of missionRequests) {
      const requestId = extractId(missionRequest.requestId);
      const citizenId = extractId(missionRequest.requestId?.userId);
      if (!requestId || !citizenId) continue;

      eventBus.emit("MISSION_FAILED", {
        requestId,
        missionId: extractId(timeline.missionId),
        citizenId,
        teamId: extractId(timeline.teamId),
        actorUserId,
        reason,
      });
    }
  }

  async emitMissionWithdrawnForMission(timeline, actorUserId) {
    const missionRequests = await missionRequestRepository.findByMissionId(
      extractId(timeline.missionId),
    );
    const requestIds = [
      ...new Set(
        missionRequests
          .map((item) => extractId(item.requestId))
          .filter(Boolean),
      ),
    ];

    eventBus.emit("MISSION_WITHDRAWN", {
      requestIds,
      missionId: extractId(timeline.missionId),
      teamId: extractId(timeline.teamId),
      actorUserId,
      teamName: timeline.teamId?.name || "Rescue Team",
      withdrawalReason: timeline.withdrawalReason,
    });
  }

  async emitMissionCompletedForMission(timeline, completionNote, actorUserId) {
    const missionRequests = await missionRequestRepository.findByMissionId(
      extractId(timeline.missionId),
    );

    for (const missionRequest of missionRequests) {
      const requestId = extractId(missionRequest.requestId);
      const citizenId = extractId(missionRequest.requestId?.userId);
      if (!requestId || !citizenId) continue;

      eventBus.emit("MISSION_COMPLETED", {
        requestId,
        missionId: extractId(timeline.missionId),
        citizenId,
        teamId: extractId(timeline.teamId),
        actorUserId,
        completionNote,
      });
    }
  }
}

export default new TimelineService();
export { assertTimelineTransition, TIMELINE_TRANSITIONS, TERMINAL_TIMELINE_STATUSES };
