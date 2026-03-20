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
    incrementRescued: jest.fn(),
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

describe("TimelineService flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should run accept -> arrive -> complete with completions and emit mission events", async () => {
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
    missionRequestRepository.findById.mockResolvedValue({
      _id: missionRequestId,
      missionId,
      requestId: { _id: requestId, userId: { _id: "citizen-flow" } },
      status: "IN_PROGRESS",
    });
    missionRequestRepository.incrementRescued.mockResolvedValue({
      _id: missionRequestId,
      missionId,
      requestId: { _id: requestId, userId: { _id: "citizen-flow" } },
      status: "FULFILLED",
    });

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
      completions: [{ missionRequestId, rescuedCount: 2 }],
    });

    expect(accepted.status).toBe("EN_ROUTE");
    expect(arrived.status).toBe("ON_SITE");
    expect(completed.status).toBe("COMPLETED");

    expect(missionRequestRepository.incrementRescued).toHaveBeenCalledWith(
      missionRequestId,
      2,
      timelineId,
      teamId,
    );

    expect(eventBus.emit).toHaveBeenCalledWith(
      "MISSION_COMPLETED",
      expect.objectContaining({
        requestId,
        missionId,
        citizenId: "citizen-flow",
      }),
    );
  });
});
