import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule("mongoose", () => ({
  default: {
    Types: {
      ObjectId: {
        isValid: jest.fn(() => true),
      },
    },
  },
}));

jest.unstable_mockModule("../../../../src/utils/events.js", () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/missions/mission.repository.js", () => ({
  default: {
    findById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/missionRequests/missionRequest.repository.js", () => ({
  missionRequestRepository: {
    markPendingInProgressByMission: jest.fn(),
    findByMissionId: jest.fn(),
    findById: jest.fn(),
    findByRequestId: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/requests/request.repository.js", () => ({
  requestRepository: {
    findRequestById: jest.fn(),
    updateRequestStatus: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/requests/request.model.js", () => ({
  REQUEST_STATUS: {
    CLOSED: "CLOSED",
    CANCELLED: "CANCELLED",
    REJECTED: "REJECTED",
    IN_PROGRESS: "IN_PROGRESS",
    PARTIALLY_FULFILLED: "PARTIALLY_FULFILLED",
    FULFILLED: "FULFILLED",
    VERIFIED: "VERIFIED",
  },
}));

jest.unstable_mockModule("../../../../src/modules/teams/team.model.js", () => ({
  TEAM_STATUS: {
    BUSY: "BUSY",
    AVAILABLE: "AVAILABLE",
  },
}));

jest.unstable_mockModule("../../../../src/modules/teams/team.repository.js", () => ({
  teamRepository: {
    updateStatus: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/users/user.model.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.model.js", () => ({
  TIMELINE_STATUS: {
    PLANNED: "PLANNED",
    ASSIGNED: "ASSIGNED",
    EN_ROUTE: "EN_ROUTE",
    ON_SITE: "ON_SITE",
    COMPLETED: "COMPLETED",
    PARTIAL: "PARTIAL",
    FAILED: "FAILED",
    WITHDRAWN: "WITHDRAWN",
    CANCELLED: "CANCELLED",
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.repository.js", () => ({
  ACTIVE_TIMELINE_STATUSES: ["ASSIGNED", "EN_ROUTE", "ON_SITE"],
  EXECUTING_TIMELINE_STATUSES: ["EN_ROUTE", "ON_SITE"],
  TERMINAL_TIMELINE_STATUSES: ["COMPLETED", "PARTIAL", "FAILED", "WITHDRAWN", "CANCELLED"],
  timelineRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    transitionStatus: jest.fn(),
    findByMissionId: jest.fn(),
    countActiveByTeamId: jest.fn(),
    findAll: jest.fn(),
    findActiveByMissionId: jest.fn(),
    updateById: jest.fn(),
  },
}));

const timelineService = (await import("../../../../src/modules/timelines/timeline.service.js")).default;
const { timelineRepository } = await import("../../../../src/modules/timelines/timeline.repository.js");
const missionRepository = (await import("../../../../src/modules/missions/mission.repository.js")).default;
const { missionRequestRepository } = await import("../../../../src/modules/missionRequests/missionRequest.repository.js");
const { eventBus } = await import("../../../../src/utils/events.js");
const { requestRepository } = await import("../../../../src/modules/requests/request.repository.js");

describe("TimelineService flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should run accept -> arrive -> complete (no completions) and emit mission events", async () => {
    const missionId = "m-flow";
    const timelineId = "tl-flow";
    const teamId = "team-flow";
    const requestId = "req-flow";
    const missionRequestId = "mr-flow";
    const actorUserId = "leader-user";

    let timelineState = {
      _id: timelineId,
      missionId,
      teamId: { _id: teamId, name: "Echo Team" },
      status: "ASSIGNED",
      note: "ready",
    };

    missionRepository.findById.mockResolvedValue({ _id: missionId, status: "PLANNED" });
    timelineRepository.findById.mockImplementation(async () => timelineState);
    timelineRepository.transitionStatus.mockImplementation(async (_id, fromStatus, updateData) => {
      if (timelineState.status !== fromStatus) {
        return null;
      }
      timelineState = { ...timelineState, ...updateData };
      return timelineState;
    });

    missionRequestRepository.markPendingInProgressByMission.mockResolvedValue({ modifiedCount: 1 });
    missionRequestRepository.findByMissionId.mockResolvedValue([
      {
        _id: missionRequestId,
        missionId,
        requestId: { _id: requestId, userId: { _id: "citizen-flow" } },
      },
    ]);
    jest.spyOn(timelineService, "getUserTeamId").mockResolvedValue(teamId);
    jest.spyOn(timelineService, "syncAllForTimeline").mockResolvedValue({ requestStatus: "IN_PROGRESS" });
    jest.spyOn(timelineService, "syncRequestStatusesForMission").mockResolvedValue();
    jest.spyOn(timelineService, "emitMissionAcceptedForMission").mockResolvedValue();
    jest.spyOn(timelineService, "emitMissionApproachingForMission").mockResolvedValue();
    jest.spyOn(timelineService, "emitMissionCompletedForMission").mockResolvedValue();

    const accepted = await timelineService.acceptTimeline(timelineId, actorUserId);
    const arrived = await timelineService.arriveTimeline(timelineId, actorUserId);
    const completed = await timelineService.completeTimeline(timelineId, actorUserId, {
      outcome: "COMPLETED",
      note: "all rescued",
    });

    expect(accepted.status).toBe("EN_ROUTE");
    expect(arrived.status).toBe("ON_SITE");
    expect(completed.status).toBe("COMPLETED");

    expect(timelineService.emitMissionCompletedForMission).toHaveBeenCalled();
  });

  describe("V3: syncRequestStatus — PARTIALLY_FULFILLED when mix FULFILLED+DROPPED", () => {
    it("should return PARTIALLY_FULFILLED when MissionRequests are mix of FULFILLED and DROPPED", async () => {
      requestRepository.findRequestById.mockResolvedValue({
        _id: "req-v3",
        status: "IN_PROGRESS",
      });
      missionRequestRepository.findByRequestId.mockResolvedValue([
        { status: "FULFILLED" },
        { status: "DROPPED" },
      ]);

      const result = await timelineService.syncRequestStatus("req-v3");

      expect(requestRepository.updateRequestStatus).toHaveBeenCalledWith(
        "req-v3",
        "PARTIALLY_FULFILLED",
      );
      expect(result).toBe("PARTIALLY_FULFILLED");
    });

    it("should return FULFILLED when all MissionRequests are FULFILLED", async () => {
      requestRepository.findRequestById.mockResolvedValue({
        _id: "req-v3b",
        status: "IN_PROGRESS",
      });
      missionRequestRepository.findByRequestId.mockResolvedValue([
        { status: "FULFILLED" },
        { status: "FULFILLED" },
      ]);

      const result = await timelineService.syncRequestStatus("req-v3b");

      expect(requestRepository.updateRequestStatus).toHaveBeenCalledWith(
        "req-v3b",
        "FULFILLED",
      );
      expect(result).toBe("FULFILLED");
    });

    it("should not update terminal request statuses (CLOSED/CANCELLED/REJECTED)", async () => {
      requestRepository.findRequestById.mockResolvedValue({
        _id: "req-v3c",
        status: "CLOSED",
      });

      const result = await timelineService.syncRequestStatus("req-v3c");

      expect(requestRepository.updateRequestStatus).not.toHaveBeenCalled();
      expect(result).toBe("CLOSED");
    });
  });

  describe("V4: cancelTimeline — should sync Request status", () => {
    it("should call syncRequestStatusesForMission after cancelling", async () => {
      const timelineId = "tl-cancel";
      const missionId = "m-cancel";
      const teamId = "team-cancel";

      timelineRepository.findById.mockResolvedValue({
        _id: timelineId,
        missionId,
        teamId: { _id: teamId },
        status: "ASSIGNED",
      });
      timelineRepository.transitionStatus.mockResolvedValue({
        _id: timelineId,
        missionId,
        teamId: { _id: teamId },
        status: "CANCELLED",
      });

      jest.spyOn(timelineService, "syncAllForTimeline").mockResolvedValue({});
      const syncReqSpy = jest.spyOn(timelineService, "syncRequestStatusesForMission").mockResolvedValue();

      await timelineService.cancelTimeline(timelineId, {});

      expect(syncReqSpy).toHaveBeenCalledWith(missionId);
    });
  });

  describe("V1: completeTimeline — no completions, only status transition", () => {
    it("should complete with PARTIAL outcome without processing any completions", async () => {
      const timelineId = "tl-partial";
      const missionId = "m-partial";
      const teamId = "team-partial";
      const actorUserId = "user-partial";

      timelineRepository.findById.mockResolvedValue({
        _id: timelineId,
        missionId,
        teamId: { _id: teamId },
        status: "ON_SITE",
        note: null,
      });
      missionRepository.findById.mockResolvedValue({ _id: missionId, status: "IN_PROGRESS" });
      timelineRepository.transitionStatus.mockResolvedValue({
        _id: timelineId,
        missionId,
        teamId: { _id: teamId },
        status: "PARTIAL",
        completedAt: new Date(),
      });

      jest.spyOn(timelineService, "getUserTeamId").mockResolvedValue(teamId);
      jest.spyOn(timelineService, "syncAllForTimeline").mockResolvedValue({});
      jest.spyOn(timelineService, "syncRequestStatusesForMission").mockResolvedValue();
      jest.spyOn(timelineService, "emitMissionCompletedForMission").mockResolvedValue();

      const result = await timelineService.completeTimeline(timelineId, actorUserId, {
        outcome: "PARTIAL",
        note: "could not rescue all",
      });

      expect(result.status).toBe("PARTIAL");
      // Should NOT call emitMissionCompletedForMission for PARTIAL outcome
      expect(timelineService.emitMissionCompletedForMission).not.toHaveBeenCalled();
      // Should still sync
      expect(timelineService.syncAllForTimeline).toHaveBeenCalled();
      expect(timelineService.syncRequestStatusesForMission).toHaveBeenCalledWith(missionId);
    });
  });
});
