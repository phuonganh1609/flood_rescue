import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule("../../../../src/modules/missions/mission.repository.js", () => ({
  default: {
    findById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.model.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
  exists: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.service.js", () => ({
  default: {
    createTimeline: jest.fn(),
    cancelActiveTimelinesByMission: jest.fn(),
    syncRequestStatus: jest.fn(),
    syncMissionStatus: jest.fn(),
    syncTeamStatus: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/requests/request.repository.js", () => ({
  requestRepository: {
    findRequestById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/requests/request.model.js", () => ({
  REQUEST_STATUS: {
    VERIFIED: "VERIFIED",
    IN_PROGRESS: "IN_PROGRESS",
    PARTIALLY_FULFILLED: "PARTIALLY_FULFILLED",
  },
}));

jest.unstable_mockModule("../../../../src/modules/teams/team.repository.js", () => ({
  teamRepository: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/missionRequests/missionRequest.repository.js", () => ({
  missionRequestRepository: {
    findByMissionId: jest.fn(),
    findByMissionAndRequest: jest.fn(),
    deleteByMissionAndRequest: jest.fn(),
    create: jest.fn(),
  findByMissionIdPaginated: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/utils/events.js", () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/teamRequests/teamRequest.service.js", () => ({
  teamRequestService: {
    createMatrix: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/supply/supply.model.js", () => ({
  default: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/missionSupplies/missionSupply.model.js", () => ({
  default: {
    insertMany: jest.fn(),
  },
}));

const missionService = (await import("../../../../src/modules/missions/mission.service.js")).default;
const missionRepository = (await import("../../../../src/modules/missions/mission.repository.js")).default;
const Timeline = (await import("../../../../src/modules/timelines/timeline.model.js")).default;
const { missionRequestRepository } = await import("../../../../src/modules/missionRequests/missionRequest.repository.js");
const { eventBus } = await import("../../../../src/utils/events.js");
const { requestRepository } = await import("../../../../src/modules/requests/request.repository.js");
const timelineService = (await import("../../../../src/modules/timelines/timeline.service.js")).default;
const { teamRepository } = await import("../../../../src/modules/teams/team.repository.js");
const { teamRequestService } = await import("../../../../src/modules/teamRequests/teamRequest.service.js");
const Supply = (await import("../../../../src/modules/supply/supply.model.js")).default;
const MissionSupply = (await import("../../../../src/modules/missionSupplies/missionSupply.model.js")).default;

describe("MissionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("startMission", () => {
    it("should reject start when mission has no mission requests", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m1", status: "DRAFT", code: "M-001" });
      missionRequestRepository.findByMissionId.mockResolvedValue([]);

      await expect(missionService.startMission("m1")).rejects.toMatchObject({
        message: "Không thể bắt đầu mission: cần có ít nhất một request",
        statusCode: 400,
        errorCode: "NO_MISSION_REQUESTS",
      });

      expect(Timeline.find).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
      expect(teamRequestService.createMatrix).not.toHaveBeenCalled();
    });

    it("should start mission, emit MISSION_ASSIGNED, and auto-create MissionSupply records", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m1", status: "DRAFT", code: "M-001" });
      missionRequestRepository.findByMissionId.mockResolvedValue([
        { 
          _id: "mr1", 
          requestId: { _id: "r1", userId: { _id: "citizen-1" } },
          requestSuppliesSnapshot: [{ name: "Water", quantity: 50 }, { name: "Food", quantity: 20 }]
        },
      ]);
      Timeline.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { teamId: { _id: "team-1", leaderId: { _id: "leader-1" }, name: "Alpha" } },
        ]),
      });
      Timeline.updateMany.mockResolvedValue({ modifiedCount: 1 });
      teamRequestService.createMatrix.mockResolvedValue({ matched: 1, upserted: 1 });
      missionRepository.update.mockResolvedValue({ _id: "m1", code: "M-001", status: "PLANNED" });
      
      Supply.find.mockResolvedValue([
        { _id: "sup-w", name: "Water" },
        { _id: "sup-f", name: "Food" }
      ]);
      MissionSupply.insertMany.mockResolvedValue([]);

      const result = await missionService.startMission("m1");

      expect(Timeline.updateMany).toHaveBeenCalledWith(
        { missionId: "m1", status: "PLANNED" },
        expect.objectContaining({
          $set: expect.objectContaining({ status: "ASSIGNED" }),
        }),
      );
      expect(missionRepository.update).toHaveBeenCalledWith("m1", { status: "PLANNED" });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "MISSION_ASSIGNED",
        expect.objectContaining({
          missionId: "m1",
          requestIds: ["r1"],
          citizenIds: ["citizen-1"],
          teamLeaderIds: ["leader-1"],
          teamNames: ["Alpha"],
        }),
      );
      expect(teamRequestService.createMatrix).toHaveBeenCalledWith({
        missionId: "m1",
        missionRequestIds: ["mr1"],
        teamIds: ["team-1"],
      });
      expect(Supply.find).toHaveBeenCalledWith({ name: { $in: ["Water", "Food"] } });
      expect(MissionSupply.insertMany).toHaveBeenCalledWith([
        { missionId: "m1", supplyId: "sup-w", plannedQty: 50, status: "REQUESTED" },
        { missionId: "m1", supplyId: "sup-f", plannedQty: 20, status: "REQUESTED" }
      ]);
      expect(result).toEqual(expect.objectContaining({ status: "PLANNED" }));
    });
  });

  describe("planning flow", () => {
    it("should allow draft mission flow: add requests -> add teams -> start", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-flow", status: "DRAFT", code: "M-FLOW" });
      requestRepository.findRequestById.mockResolvedValue({
        _id: "r-flow",
        status: "VERIFIED",
        peopleCount: 4,
        requestSupplies: [{ name: "Water", requestedQty: 2 }],
      });
      missionRequestRepository.findByMissionAndRequest.mockResolvedValue(null);
      missionRequestRepository.create.mockResolvedValue({ _id: "mr-flow", requestId: "r-flow" });

      teamRepository.findById.mockResolvedValue({ _id: "team-flow", name: "Bravo" });
      timelineService.createTimeline.mockResolvedValue({ _id: "tl-flow", teamId: "team-flow" });

      teamRequestService.createMatrix.mockResolvedValue({ matched: 1, upserted: 1 });
      missionRequestRepository.findByMissionId
        .mockResolvedValueOnce([{ _id: "mr-flow", requestId: { _id: "r-flow", userId: { _id: "citizen-flow" } } }])
        .mockResolvedValueOnce([{ _id: "mr-flow", requestId: { _id: "r-flow", userId: { _id: "citizen-flow" } } }]);

      Timeline.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { teamId: { _id: "team-flow", leaderId: { _id: "leader-flow" }, name: "Bravo" } },
        ]),
      });
      Timeline.updateMany.mockResolvedValue({ modifiedCount: 1 });
      missionRepository.update.mockResolvedValue({ _id: "m-flow", code: "M-FLOW", status: "PLANNED" });

      const addedRequests = await missionService.addRequestsToMission("m-flow", {
        requestIds: ["r-flow"],
        note: "urgent",
      });
      const addedTeams = await missionService.assignTeamsToMission("m-flow", {
        teamIds: ["team-flow"],
        note: "team-ready",
      });
      const started = await missionService.startMission("m-flow");

      expect(addedRequests).toHaveLength(1);
      expect(addedTeams).toHaveLength(1);
      expect(started.status).toBe("PLANNED");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "MISSION_ASSIGNED",
        expect.objectContaining({
          missionId: "m-flow",
          requestIds: ["r-flow"],
          teamLeaderIds: ["leader-flow"],
        }),
      );
    });
  });

  describe("remove planning links", () => {
    it("should remove request link when mission is DRAFT and mission request is PENDING", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-rm", status: "DRAFT" });
      missionRequestRepository.findByMissionAndRequest.mockResolvedValue({
        _id: "mr-1",
        status: "PENDING",
      });
      missionRequestRepository.deleteByMissionAndRequest.mockResolvedValue({
        deletedCount: 1,
      });

      const result = await missionService.removeRequestFromMission("m-rm", "r-rm");

      expect(missionRequestRepository.deleteByMissionAndRequest).toHaveBeenCalledWith(
        "m-rm",
        "r-rm",
      );
      expect(timelineService.syncRequestStatus).toHaveBeenCalledWith("r-rm");
      expect(timelineService.syncMissionStatus).toHaveBeenCalledWith("m-rm");
      expect(result).toEqual({
        missionId: "m-rm",
        requestId: "r-rm",
        removed: true,
      });
    });

    it("should reject removing request link when mission request is not PENDING", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-rm", status: "DRAFT" });
      missionRequestRepository.findByMissionAndRequest.mockResolvedValue({
        _id: "mr-1",
        status: "IN_PROGRESS",
      });

      await expect(
        missionService.removeRequestFromMission("m-rm", "r-rm"),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "INVALID_MISSION_REQUEST_STATUS_FOR_REMOVE",
      });

      expect(missionRequestRepository.deleteByMissionAndRequest).not.toHaveBeenCalled();
    });

    it("should return 404 when request link does not exist in mission", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-rm", status: "DRAFT" });
      missionRequestRepository.findByMissionAndRequest.mockResolvedValue(null);

      await expect(
        missionService.removeRequestFromMission("m-rm", "r-rm"),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "MISSION_REQUEST_NOT_FOUND",
      });
    });

    it("should remove team link when mission is DRAFT and timeline is ASSIGNED", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-team", status: "DRAFT" });
      Timeline.findOne.mockResolvedValue({ _id: "tl-1", status: "ASSIGNED" });
      Timeline.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await missionService.removeTeamFromMission("m-team", "team-1");

      expect(Timeline.findOne).toHaveBeenCalledWith({ missionId: "m-team", teamId: "team-1" });
      expect(Timeline.deleteOne).toHaveBeenCalledWith({ missionId: "m-team", teamId: "team-1" });
      expect(timelineService.syncMissionStatus).toHaveBeenCalledWith("m-team");
      expect(timelineService.syncTeamStatus).toHaveBeenCalledWith("team-1");
      expect(result).toEqual({
        missionId: "m-team",
        teamId: "team-1",
        removed: true,
      });
    });

    it("should reject removing team link when timeline status is not allowed", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-team", status: "DRAFT" });
      Timeline.findOne.mockResolvedValue({ _id: "tl-1", status: "EN_ROUTE" });

      await expect(
        missionService.removeTeamFromMission("m-team", "team-1"),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "INVALID_TIMELINE_STATUS_FOR_REMOVE",
      });

      expect(Timeline.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe("getMissionRequests", () => {
    const paginatedResult = {
      data: [{ _id: "mr-1", requestId: { _id: "r-1", userName: "Nguyen Van A" } }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    it("should return paginated requests without teamId filter (coordinator)", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-1", status: "IN_PROGRESS" });
      missionRequestRepository.findByMissionIdPaginated.mockResolvedValue(paginatedResult);

      const result = await missionService.getMissionRequests(
        "m-1",
        { page: 1, limit: 10 },
        { role: "Rescue Coordinator" },
      );

      expect(missionRequestRepository.findByMissionIdPaginated).toHaveBeenCalledWith("m-1", {
        teamId: null,
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(paginatedResult);
    });

    it("should filter by teamId when team is assigned to mission", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-1", status: "IN_PROGRESS" });
      Timeline.exists.mockResolvedValue(true);
      missionRequestRepository.findByMissionIdPaginated.mockResolvedValue(paginatedResult);

      const result = await missionService.getMissionRequests(
        "m-1",
        { teamId: "team-1", page: 1, limit: 10 },
        { role: "Rescue Coordinator" },
      );

      expect(Timeline.exists).toHaveBeenCalledWith({ missionId: "m-1", teamId: "team-1" });
      expect(missionRequestRepository.findByMissionIdPaginated).toHaveBeenCalledWith("m-1", {
        teamId: "team-1",
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(paginatedResult);
    });

    it("should throw 403 when teamId provided but team not assigned to mission", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-1", status: "IN_PROGRESS" });
      Timeline.exists.mockResolvedValue(false);

      await expect(
        missionService.getMissionRequests(
          "m-1",
          { teamId: "team-unknown" },
          { role: "Rescue Coordinator" },
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        errorCode: "TEAM_NOT_ASSIGNED_TO_MISSION",
      });

      expect(missionRequestRepository.findByMissionIdPaginated).not.toHaveBeenCalled();
    });

    it("should throw 403 when Rescue Team user not assigned to mission", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-1", status: "IN_PROGRESS" });
      Timeline.exists.mockResolvedValue(false);

      await expect(
        missionService.getMissionRequests(
          "m-1",
          {},
          { id: "u-1", role: "Rescue Team", teamId: "team-x" },
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        errorCode: "MISSION_NOT_ASSIGNED_TO_TEAM",
      });
    });

    it("should throw 404 when mission does not exist", async () => {
      missionRepository.findById.mockResolvedValue(null);

      await expect(
        missionService.getMissionRequests("no-such-id", {}, null),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "MISSION_NOT_FOUND",
      });
    });

    it("should allow Rescue Team to access mission they are assigned to", async () => {
      missionRepository.findById.mockResolvedValue({ _id: "m-1", status: "IN_PROGRESS" });
      Timeline.exists.mockResolvedValue(true);
      missionRequestRepository.findByMissionIdPaginated.mockResolvedValue(paginatedResult);

      const result = await missionService.getMissionRequests(
        "m-1",
        { page: 1, limit: 10 },
        { id: "u-1", role: "Rescue Team", teamId: "team-1" },
      );

      expect(result).toEqual(paginatedResult);
    });
  });
});
