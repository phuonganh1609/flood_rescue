import { missionRequestRepository } from "./missionRequest.repository.js";
import { MISSION_REQUEST_STATUS } from "./missionRequest.model.js";
import missionRepository from "../missions/mission.repository.js";
import { requestRepository } from "../requests/request.repository.js";
import { REQUEST_STATUS } from "../requests/request.model.js";
import {
  EXECUTING_TIMELINE_STATUSES,
  TERMINAL_TIMELINE_STATUSES,
  timelineRepository,
} from "../timelines/timeline.repository.js";
import { teamRequestRepository } from "../teamRequests/teamRequest.repository.js";
import { eventBus } from "../../utils/events.js";

class MissionRequestService {
  deriveRequestStatus(missionRequests = []) {
    if (missionRequests.length === 0) return null;

    const statuses = missionRequests.map((item) => item.status);
    const hasNonTerminal = statuses.some((status) =>
      [
        MISSION_REQUEST_STATUS.PENDING,
        MISSION_REQUEST_STATUS.IN_PROGRESS,
        MISSION_REQUEST_STATUS.PARTIAL,
      ].includes(status),
    );

    if (hasNonTerminal) {
      return REQUEST_STATUS.IN_PROGRESS;
    }

    const allClosed = missionRequests.every(
      (item) => item.status === MISSION_REQUEST_STATUS.CLOSED,
    );

    return allClosed
      ? REQUEST_STATUS.FULFILLED
      : REQUEST_STATUS.PARTIALLY_FULFILLED;
  }

  deriveMissionStatus(timelines = [], missionRequests = []) {
    if (timelines.length === 0) {
      return "DRAFT";
    }

    const hasExecuting = timelines.some((timeline) =>
      EXECUTING_TIMELINE_STATUSES.includes(timeline.status),
    );
    if (hasExecuting) return "IN_PROGRESS";

    const hasAssigned = timelines.some((timeline) => timeline.status === "ASSIGNED");
    if (hasAssigned) return "PLANNED";

    const hasPlanned = timelines.some((timeline) => timeline.status === "PLANNED");
    if (hasPlanned) return "DRAFT";

    const allTimelinesTerminal =
      timelines.length > 0 &&
      timelines.every((timeline) => TERMINAL_TIMELINE_STATUSES.includes(timeline.status));
    if (!allTimelinesTerminal) {
      return "PARTIAL";
    }

    const allMissionRequestsTerminal =
      missionRequests.length > 0 &&
      missionRequests.every((item) =>
        [
          MISSION_REQUEST_STATUS.FULFILLED,
          MISSION_REQUEST_STATUS.CLOSED,
          MISSION_REQUEST_STATUS.DROPPED,
        ].includes(item.status),
      );

    if (!allMissionRequestsTerminal) {
      return "PARTIAL";
    }

    const hasUnmetTarget = missionRequests.some(
      (item) => (Number(item.fulfillmentPercent) || 0) < 100,
    );

    return hasUnmetTarget ? "PARTIAL" : "COMPLETED";
  }

  validateSupplyDeliveryBounds(missionRequest, contributionSummary, incomingSupplies = []) {
    const requestedSupplies = missionRequest.requestSuppliesSnapshot || [];
    if (requestedSupplies.length === 0 || incomingSupplies.length === 0) return;

    const requestedMap = new Map();
    for (const item of requestedSupplies) {
      const name = item.name?.trim?.();
      if (!name) continue;
      requestedMap.set(name, (requestedMap.get(name) || 0) + (Number(item.requestedQty) || 0));
    }

    const deliveredMap = new Map();
    for (const item of contributionSummary.totalSuppliesDelivered || []) {
      const name = item.name?.trim?.();
      if (!name) continue;
      deliveredMap.set(name, (deliveredMap.get(name) || 0) + (Number(item.deliveredQty) || 0));
    }

    for (const supply of incomingSupplies) {
      const name = supply.name?.trim?.();
      if (!name || !requestedMap.has(name)) continue;

      const requestedQty = requestedMap.get(name);
      const deliveredQty = deliveredMap.get(name) || 0;

      if (deliveredQty > requestedQty) {
        const error = new Error(
          `Supply ${name} delivered quantity cannot exceed requested quantity of ${requestedQty}.`,
        );
        error.statusCode = 400;
        error.errorCode = "SUPPLY_OVER_DELIVERY";
        throw error;
      }
    }
  }

  async getById(id) {
    const missionRequest = await missionRequestRepository.findById(id);
    if (!missionRequest) {
      const error = new Error(`Không tìm thấy mission request với ID: ${id}`);
      error.statusCode = 404;
      error.errorCode = "MISSION_REQUEST_NOT_FOUND";
      throw error;
    }
    return missionRequest;
  }

  async getAll(query = {}) {
    const { status, limit, page, sort } = query;
    return await missionRequestRepository.findAll({ status, limit, page, sort });
  }

  ensureCanTransition(currentStatus, nextStatus) {
    const terminalStatuses = [
      MISSION_REQUEST_STATUS.FULFILLED,
      MISSION_REQUEST_STATUS.CLOSED,
      MISSION_REQUEST_STATUS.DROPPED,
    ];

    if (terminalStatuses.includes(currentStatus)) {
      const error = new Error(
        `Không thể chuyển trạng thái mission request: trạng thái hiện tại ${currentStatus} đã là trạng thái kết thúc`,
      );
      error.statusCode = 400;
      error.errorCode = "MISSION_REQUEST_TERMINAL";
      throw error;
    }

    if (
      nextStatus === MISSION_REQUEST_STATUS.DROPPED &&
      currentStatus === MISSION_REQUEST_STATUS.FULFILLED
    ) {
      const error = new Error(
        `Không thể chuyển mission request từ ${currentStatus} sang ${nextStatus}`,
      );
      error.statusCode = 400;
      error.errorCode = "INVALID_MISSION_REQUEST_TRANSITION";
      throw error;
    }
  }

  async syncRequestStatus(requestId) {
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
    if (missionRequests.length === 0) return request.status;

    let desiredStatus = this.deriveRequestStatus(missionRequests) || request.status;

    if (desiredStatus === REQUEST_STATUS.FULFILLED) {
      desiredStatus = REQUEST_STATUS.CLOSED;
    }

    if (desiredStatus !== request.status) {
      await requestRepository.updateRequestStatus(requestId, desiredStatus);

      if (desiredStatus === REQUEST_STATUS.CLOSED) {
        eventBus.emit("REQUEST_CLOSED", { requestId });
      }
    }

    return desiredStatus;
  }

  async syncMissionStatus(missionId) {
    const mission = await missionRepository.findById(missionId);
    if (!mission) return null;

    if (["ABORTED", "PAUSED"].includes(mission.status)) {
      return mission.status;
    }

    const timelines = await timelineRepository.findByMissionId(missionId);
    if (timelines.length === 0) {
      if (mission.status !== "DRAFT") {
        await missionRepository.update(missionId, { status: "DRAFT" });
      }
      return "DRAFT";
    }

    const missionRequests = await missionRequestRepository.findByMissionId(missionId);
    const desiredStatus = this.deriveMissionStatus(timelines, missionRequests);
    if (mission.status !== desiredStatus) {
      await missionRepository.update(missionId, { status: desiredStatus });
    }
    return desiredStatus;
  }

  async syncAfterMissionRequestUpdate(missionRequest) {
    const requestId = missionRequest.requestId?._id?.toString?.() || missionRequest.requestId?.toString?.();
    const missionId = missionRequest.missionId?._id?.toString?.() || missionRequest.missionId?.toString?.();

    if (requestId) {
      await this.syncRequestStatus(requestId);
    }

    if (missionId) {
      await this.syncMissionStatus(missionId);
    }
  }

  async closeById(id, note = null) {
    const missionRequest = await this.getById(id);
    this.ensureCanTransition(missionRequest.status, MISSION_REQUEST_STATUS.CLOSED);

    const updated = await missionRequestRepository.updateStatusWithNote(
      id,
      MISSION_REQUEST_STATUS.CLOSED,
      note,
    );
    await this.syncAfterMissionRequestUpdate(updated);
    return updated;
  }

  async dropById(id, note = null) {
    const missionRequest = await this.getById(id);
    this.ensureCanTransition(missionRequest.status, MISSION_REQUEST_STATUS.DROPPED);

    const updated = await missionRequestRepository.updateStatusWithNote(
      id,
      MISSION_REQUEST_STATUS.DROPPED,
      note,
    );
    await this.syncAfterMissionRequestUpdate(updated);
    return updated;
  }

  async updateProgress(id, { peopleRescuedIncrement = 0, suppliesDelivered = [] } = {}, user) {
    const missionRequest = await this.getById(id);

    // Early return if already CLOSED - return 200 OK with message
    if (missionRequest.status === MISSION_REQUEST_STATUS.CLOSED) {
      return {
        ...missionRequest.toObject(),
        message: "Mission already completed",
      };
    }

    // Chỉ cho phép khi chưa kết thúc
    this.ensureCanTransition(missionRequest.status, MISSION_REQUEST_STATUS.IN_PROGRESS);

    // Lấy missionId và kiểm tra user.teamId có Timeline trong mission này
    const missionId =
      missionRequest.missionId?._id?.toString?.() ||
      missionRequest.missionId?.toString?.();

    const mission = await missionRepository.findById(missionId);
    if (!mission) {
      const error = new Error(`Không tìm thấy mission với ID: ${missionId}`);
      error.statusCode = 404;
      error.errorCode = "MISSION_NOT_FOUND";
      throw error;
    }

    if (["ABORTED", "COMPLETED", "PAUSED"].includes(mission.status)) {
      const error = new Error(
        `Không thể cập nhật progress: mission đang ở trạng thái ${mission.status}`,
      );
      error.statusCode = 400;
      error.errorCode = "MISSION_UNAVAILABLE_FOR_PROGRESS";
      throw error;
    }

    let teamId = null;
    if (user?.teamId) {
      teamId = user.teamId.toString();
    } else if (user?.id) {
      const UserModel = (await import("../users/user.model.js")).default;
      const userDoc = await UserModel.findById(user.id).select("teamId");
      teamId = userDoc?.teamId?.toString() || null;
    }

    if (!teamId) {
      const error = new Error("Bạn chưa thuộc team nào.");
      error.statusCode = 403;
      error.errorCode = "USER_NOT_IN_TEAM";
      throw error;
    }

    // Kiểm tra team có Timeline trong mission này không
    const TimelineModel = (await import("../timelines/timeline.model.js")).default;
    const hasTimeline = await TimelineModel.exists({ missionId, teamId });
    if (!hasTimeline) {
      const error = new Error("Team của bạn không được assign vào mission này.");
      error.statusCode = 403;
      error.errorCode = "TEAM_NOT_ASSIGNED_TO_MISSION";
      throw error;
    }

    const hasExecutingTimeline = await TimelineModel.exists({
      missionId,
      teamId,
      status: { $in: ["EN_ROUTE", "ON_SITE"] },
    });

    if (!hasExecutingTimeline) {
      const hasPreAcceptTimeline = await TimelineModel.exists({
        missionId,
        teamId,
        status: { $in: ["PLANNED", "ASSIGNED"] },
      });
      if (hasPreAcceptTimeline) {
        const error = new Error("Team phải accept mission trước khi cập nhật progress.");
        error.statusCode = 400;
        error.errorCode = "TEAM_MUST_ACCEPT_BEFORE_PROGRESS";
        throw error;
      }

      const hasTerminalTimeline = await TimelineModel.exists({
        missionId,
        teamId,
        status: { $in: ["WITHDRAWN", "FAILED", "COMPLETED", "PARTIAL", "CANCELLED"] },
      });
      if (hasTerminalTimeline) {
        const error = new Error("Không thể cập nhật progress khi timeline của team đã kết thúc.");
        error.statusCode = 400;
        error.errorCode = "PROGRESS_NOT_ALLOWED_IN_TERMINAL_STATE";
        throw error;
      }
    }

    const normalizedSupplies = (suppliesDelivered || []).map((item) => ({
      name: item.name?.trim?.(),
      deliveredQty: Number(item.deliveredQty) || 0,
    })).filter((item) => item.name && item.deliveredQty > 0);

    if ((Number(peopleRescuedIncrement) || 0) <= 0 && normalizedSupplies.length === 0) {
      const error = new Error("Payload progress không hợp lệ.");
      error.statusCode = 400;
      error.errorCode = "INVALID_PROGRESS_PAYLOAD";
      throw error;
    }

    const contributionSummaryBefore = await teamRequestRepository.getContributionSummaryByMissionRequestId(id);
    const simulatedSummary = {
      ...contributionSummaryBefore,
      totalRescued: (Number(contributionSummaryBefore.totalRescued) || 0) + (Number(peopleRescuedIncrement) || 0),
      totalSuppliesDelivered: [
        ...(contributionSummaryBefore.totalSuppliesDelivered || []),
        ...normalizedSupplies,
      ],
    };
    this.validateSupplyDeliveryBounds(missionRequest, simulatedSummary, normalizedSupplies);

    await teamRequestRepository.upsertContribution({
      missionId,
      missionRequestId: id,
      teamId,
      peopleRescuedIncrement,
      suppliesDelivered: normalizedSupplies,
      updatedBy: user?.id || null,
    });

    const contributionSummary = await teamRequestRepository.getContributionSummaryByMissionRequestId(id);
    const updated = await missionRequestRepository.syncAggregateFromContributionSummary(
      id,
      contributionSummary,
    );

    await this.syncAfterMissionRequestUpdate(updated);
    return updated;
  }
}

export default new MissionRequestService();
