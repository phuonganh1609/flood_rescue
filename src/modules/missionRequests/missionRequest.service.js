import { missionRequestRepository } from "./missionRequest.repository.js";
import { MISSION_REQUEST_STATUS } from "./missionRequest.model.js";
import missionRepository from "../missions/mission.repository.js";
import { requestRepository } from "../requests/request.repository.js";
import { REQUEST_STATUS } from "../requests/request.model.js";
import {
  EXECUTING_TIMELINE_STATUSES,
  timelineRepository,
} from "../timelines/timeline.repository.js";

class MissionRequestService {
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

    const statuses = missionRequests.map((item) => item.status);
    const hasNonTerminal = statuses.some((status) =>
      [
        MISSION_REQUEST_STATUS.PENDING,
        MISSION_REQUEST_STATUS.IN_PROGRESS,
        MISSION_REQUEST_STATUS.PARTIAL,
      ].includes(status),
    );

    const desiredStatus =
      hasNonTerminal ? REQUEST_STATUS.IN_PROGRESS : REQUEST_STATUS.FULFILLED;

    if (desiredStatus !== request.status) {
      await requestRepository.updateRequestStatus(requestId, desiredStatus);
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

    const hasExecuting = timelines.some((timeline) =>
      EXECUTING_TIMELINE_STATUSES.includes(timeline.status),
    );
    if (hasExecuting) {
      if (mission.status !== "IN_PROGRESS") {
        await missionRepository.update(missionId, { status: "IN_PROGRESS" });
      }
      return "IN_PROGRESS";
    }

    const hasAssigned = timelines.some((timeline) => timeline.status === "ASSIGNED");
    if (hasAssigned) {
      if (mission.status !== "PLANNED") {
        await missionRepository.update(missionId, { status: "PLANNED" });
      }
      return "PLANNED";
    }

    const hasPlanned = timelines.some((timeline) => timeline.status === "PLANNED");
    if (hasPlanned) {
      if (mission.status !== "DRAFT") {
        await missionRepository.update(missionId, { status: "DRAFT" });
      }
      return "DRAFT";
    }

    const missionRequests = await missionRequestRepository.findByMissionId(missionId);
    const allTerminal =
      missionRequests.length > 0 &&
      missionRequests.every((item) =>
        [
          MISSION_REQUEST_STATUS.FULFILLED,
          MISSION_REQUEST_STATUS.CLOSED,
          MISSION_REQUEST_STATUS.DROPPED,
        ].includes(item.status),
      );

    const desiredStatus = allTerminal ? "COMPLETED" : "PARTIAL";
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

    // Chỉ cho phép khi chưa kết thúc
    this.ensureCanTransition(missionRequest.status, MISSION_REQUEST_STATUS.IN_PROGRESS);

    // Lấy missionId và kiểm tra user.teamId có Timeline trong mission này
    const missionId =
      missionRequest.missionId?._id?.toString?.() ||
      missionRequest.missionId?.toString?.();

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

    const updated = await missionRequestRepository.updateProgress(id, {
      peopleRescuedIncrement,
      suppliesDelivered,
      teamId,
    });

    await this.syncAfterMissionRequestUpdate(updated);
    return updated;
  }
}

export default new MissionRequestService();
