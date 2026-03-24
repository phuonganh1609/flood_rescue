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

jest.unstable_mockModule("../../../../src/modules/users/user.model.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/teamRequests/teamRequest.repository.js", () => ({
  teamRequestRepository: {
    findById: jest.fn(),
    markComplete: jest.fn(),
    countIncompleteByMissionAndTeam: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/missionRequests/missionRequest.repository.js", () => ({
  missionRequestRepository: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.repository.js", () => ({
  timelineRepository: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/requests/request.model.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.service.js", () => ({
  default: {
    completeTimelineFromTeamRequest: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/missionRequests/missionRequest.service.js", () => ({
  default: {
    syncAfterMissionRequestUpdate: jest.fn(),
  },
}));

const { teamRequestService } = await import("../../../../src/modules/teamRequests/teamRequest.service.js");
const { teamRequestRepository } = await import("../../../../src/modules/teamRequests/teamRequest.repository.js");
const { missionRequestRepository } = await import("../../../../src/modules/missionRequests/missionRequest.repository.js");
const { timelineRepository } = await import("../../../../src/modules/timelines/timeline.repository.js");
const RequestModel = (await import("../../../../src/modules/requests/request.model.js")).default;
const TimelineService = (await import("../../../../src/modules/timelines/timeline.service.js")).default;
const MissionRequestService = (await import("../../../../src/modules/missionRequests/missionRequest.service.js")).default;

describe("TeamRequestService.completeTeamRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should complete with COMPLETED outcome when rescued count >= target", async () => {
    const teamRequestId = "tr-1";
    const userId = "user-1";
    const teamId = "team-1";
    const missionId = "mission-1";
    const missionRequestId = "mr-1";
    const requestId = "req-1";

    teamRequestRepository.findById.mockResolvedValue({
      _id: teamRequestId,
      teamId: { _id: teamId },
      missionId: { _id: missionId },
      missionRequestId: { _id: missionRequestId },
      rescuedCountTotal: 10,
      completedAt: null,
    });

    timelineRepository.findOne.mockResolvedValue({
      _id: "timeline-1",
      status: "ON_SITE",
      missionId,
      teamId,
    });

    missionRequestRepository.findById.mockResolvedValue({
      _id: missionRequestId,
      requestId: { _id: requestId },
    });

    RequestModel.findById.mockResolvedValue({
      _id: requestId,
      peopleNeeded: 10,
    });

    teamRequestRepository.markComplete.mockResolvedValue({
      _id: teamRequestId,
      outcome: "COMPLETED",
      completedAt: new Date(),
    });

    teamRequestRepository.countIncompleteByMissionAndTeam.mockResolvedValue(0);

    const result = await teamRequestService.completeTeamRequest(
      teamRequestId,
      { note: "All rescued" },
      { id: userId, teamId },
    );

    expect(teamRequestRepository.markComplete).toHaveBeenCalledWith(teamRequestId, {
      outcome: "COMPLETED",
      note: "All rescued",
      completedBy: userId,
    });

    expect(result.outcome).toBe("COMPLETED");
    expect(TimelineService.completeTimelineFromTeamRequest).toHaveBeenCalledWith(
      "timeline-1",
      "COMPLETED",
      "All rescued",
      userId,
    );
  });

  it("should complete with PARTIAL outcome when rescued count < target", async () => {
    const teamRequestId = "tr-2";
    const userId = "user-2";
    const teamId = "team-2";
    const missionId = "mission-2";
    const missionRequestId = "mr-2";
    const requestId = "req-2";

    teamRequestRepository.findById.mockResolvedValue({
      _id: teamRequestId,
      teamId: { _id: teamId },
      missionId: { _id: missionId },
      missionRequestId: { _id: missionRequestId },
      rescuedCountTotal: 5,
      completedAt: null,
    });

    timelineRepository.findOne.mockResolvedValue({
      _id: "timeline-2",
      status: "ON_SITE",
      missionId,
      teamId,
    });

    missionRequestRepository.findById.mockResolvedValue({
      _id: missionRequestId,
      requestId: { _id: requestId },
    });

    RequestModel.findById.mockResolvedValue({
      _id: requestId,
      peopleNeeded: 10,
    });

    teamRequestRepository.markComplete.mockResolvedValue({
      _id: teamRequestId,
      outcome: "PARTIAL",
      completedAt: new Date(),
    });

    teamRequestRepository.countIncompleteByMissionAndTeam.mockResolvedValue(0);

    const result = await teamRequestService.completeTeamRequest(
      teamRequestId,
      { note: "Only 5 rescued" },
      { id: userId, teamId },
    );

    expect(teamRequestRepository.markComplete).toHaveBeenCalledWith(teamRequestId, {
      outcome: "PARTIAL",
      note: "Only 5 rescued",
      completedBy: userId,
    });

    expect(result.outcome).toBe("PARTIAL");
    expect(TimelineService.completeTimelineFromTeamRequest).toHaveBeenCalledWith(
      "timeline-2",
      "PARTIAL",
      "Only 5 rescued",
      userId,
    );
  });

  it("should NOT auto-complete Timeline when there are incomplete TeamRequests remaining", async () => {
    const teamRequestId = "tr-3";
    const userId = "user-3";
    const teamId = "team-3";
    const missionId = "mission-3";
    const missionRequestId = "mr-3";
    const requestId = "req-3";

    teamRequestRepository.findById.mockResolvedValue({
      _id: teamRequestId,
      teamId: { _id: teamId },
      missionId: { _id: missionId },
      missionRequestId: { _id: missionRequestId },
      rescuedCountTotal: 10,
      completedAt: null,
    });

    timelineRepository.findOne.mockResolvedValue({
      _id: "timeline-3",
      status: "ON_SITE",
      missionId,
      teamId,
    });

    missionRequestRepository.findById.mockResolvedValue({
      _id: missionRequestId,
      requestId: { _id: requestId },
    });

    RequestModel.findById.mockResolvedValue({
      _id: requestId,
      peopleNeeded: 10,
    });

    teamRequestRepository.markComplete.mockResolvedValue({
      _id: teamRequestId,
      outcome: "COMPLETED",
      completedAt: new Date(),
    });

    teamRequestRepository.countIncompleteByMissionAndTeam.mockResolvedValue(2);

    await teamRequestService.completeTeamRequest(
      teamRequestId,
      { note: "Done with this one" },
      { id: userId, teamId },
    );

    expect(TimelineService.completeTimelineFromTeamRequest).not.toHaveBeenCalled();
    expect(MissionRequestService.syncAfterMissionRequestUpdate).toHaveBeenCalled();
  });

  it("should reject if Timeline is not ON_SITE", async () => {
    const teamRequestId = "tr-4";
    const userId = "user-4";
    const teamId = "team-4";
    const missionId = "mission-4";

    teamRequestRepository.findById.mockResolvedValue({
      _id: teamRequestId,
      teamId: { _id: teamId },
      missionId: { _id: missionId },
      missionRequestId: { _id: "mr-4" },
      rescuedCountTotal: 10,
      completedAt: null,
    });

    timelineRepository.findOne.mockResolvedValue({
      _id: "timeline-4",
      status: "EN_ROUTE",
      missionId,
      teamId,
    });

    await expect(
      teamRequestService.completeTeamRequest(
        teamRequestId,
        { note: "Try to complete" },
        { id: userId, teamId },
      ),
    ).rejects.toThrow("Team phải ở trạng thái ON_SITE");
  });

  it("should reject if TeamRequest already completed", async () => {
    const teamRequestId = "tr-5";
    const userId = "user-5";
    const teamId = "team-5";

    teamRequestRepository.findById.mockResolvedValue({
      _id: teamRequestId,
      teamId: { _id: teamId },
      missionId: { _id: "mission-5" },
      missionRequestId: { _id: "mr-5" },
      rescuedCountTotal: 10,
      completedAt: new Date(),
    });

    await expect(
      teamRequestService.completeTeamRequest(
        teamRequestId,
        { note: "Try again" },
        { id: userId, teamId },
      ),
    ).rejects.toThrow("Team request already completed");
  });

  it("should reject if user is not in the team", async () => {
    const teamRequestId = "tr-6";
    const userId = "user-6";
    const wrongTeamId = "team-wrong";
    const correctTeamId = "team-6";

    teamRequestRepository.findById.mockResolvedValue({
      _id: teamRequestId,
      teamId: { _id: correctTeamId },
      missionId: { _id: "mission-6" },
      missionRequestId: { _id: "mr-6" },
      rescuedCountTotal: 10,
      completedAt: null,
    });

    await expect(
      teamRequestService.completeTeamRequest(
        teamRequestId,
        { note: "Unauthorized" },
        { id: userId, teamId: wrongTeamId },
      ),
    ).rejects.toThrow("Bạn không có quyền complete team request này");
  });

  it("should sync MissionRequest status after completion", async () => {
    const teamRequestId = "tr-7";
    const userId = "user-7";
    const teamId = "team-7";
    const missionId = "mission-7";
    const missionRequestId = "mr-7";
    const requestId = "req-7";

    const mockMissionRequest = {
      _id: missionRequestId,
      requestId: { _id: requestId },
    };

    teamRequestRepository.findById.mockResolvedValue({
      _id: teamRequestId,
      teamId: { _id: teamId },
      missionId: { _id: missionId },
      missionRequestId: { _id: missionRequestId },
      rescuedCountTotal: 8,
      completedAt: null,
    });

    timelineRepository.findOne.mockResolvedValue({
      _id: "timeline-7",
      status: "ON_SITE",
      missionId,
      teamId,
    });

    missionRequestRepository.findById.mockResolvedValue(mockMissionRequest);

    RequestModel.findById.mockResolvedValue({
      _id: requestId,
      peopleNeeded: 10,
    });

    teamRequestRepository.markComplete.mockResolvedValue({
      _id: teamRequestId,
      outcome: "PARTIAL",
      completedAt: new Date(),
    });

    teamRequestRepository.countIncompleteByMissionAndTeam.mockResolvedValue(1);

    await teamRequestService.completeTeamRequest(
      teamRequestId,
      {},
      { id: userId, teamId },
    );

    expect(MissionRequestService.syncAfterMissionRequestUpdate).toHaveBeenCalledWith(
      mockMissionRequest,
    );
  });
});
