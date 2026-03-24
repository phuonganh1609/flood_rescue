import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule("../../../../src/modules/missionRequests/missionRequest.repository.js", () => ({
  missionRequestRepository: {
    findById: jest.fn(),
    updateStatusWithNote: jest.fn(),
    findByRequestId: jest.fn(),
    findByMissionId: jest.fn(),
    syncAggregateFromContributionSummary: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/teamRequests/teamRequest.repository.js", () => ({
  teamRequestRepository: {
    upsertContribution: jest.fn(),
    getContributionSummaryByMissionRequestId: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/missions/mission.repository.js", () => ({
  default: {
    findById: jest.fn(),
    update: jest.fn(),
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
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.repository.js", () => ({
  EXECUTING_TIMELINE_STATUSES: ["EN_ROUTE", "ON_SITE"],
  TERMINAL_TIMELINE_STATUSES: ["COMPLETED", "PARTIAL", "FAILED", "WITHDRAWN", "CANCELLED"],
  timelineRepository: {
    findByMissionId: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.model.js", () => ({
  default: {
    exists: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/users/user.model.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

const missionRequestService = (await import("../../../../src/modules/missionRequests/missionRequest.service.js")).default;
const { missionRequestRepository } = await import("../../../../src/modules/missionRequests/missionRequest.repository.js");
const { teamRequestRepository } = await import("../../../../src/modules/teamRequests/teamRequest.repository.js");
const missionRepository = (await import("../../../../src/modules/missions/mission.repository.js")).default;
const { requestRepository } = await import("../../../../src/modules/requests/request.repository.js");
const { timelineRepository } = await import("../../../../src/modules/timelines/timeline.repository.js");
const Timeline = (await import("../../../../src/modules/timelines/timeline.model.js")).default;
const UserModel = (await import("../../../../src/modules/users/user.model.js")).default;

describe("MissionRequestService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("closeById", () => {
    it("should close mission request and trigger post-sync", async () => {
      const syncSpy = jest
        .spyOn(missionRequestService, "syncAfterMissionRequestUpdate")
        .mockResolvedValue();

      missionRequestRepository.findById.mockResolvedValue({
        _id: "mr-1",
        status: "IN_PROGRESS",
      });

      missionRequestRepository.updateStatusWithNote.mockResolvedValue({
        _id: "mr-1",
        status: "CLOSED",
        requestId: "r-1",
        missionId: "m-1",
        note: "citizen no longer needs support",
      });

      const result = await missionRequestService.closeById(
        "mr-1",
        "citizen no longer needs support",
      );

      expect(missionRequestRepository.updateStatusWithNote).toHaveBeenCalledWith(
        "mr-1",
        "CLOSED",
        "citizen no longer needs support",
      );
      expect(syncSpy).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "mr-1", status: "CLOSED" }),
      );
      expect(result).toEqual(expect.objectContaining({ status: "CLOSED" }));
    });

    it("should throw 404 when mission request is missing", async () => {
      missionRequestRepository.findById.mockResolvedValue(null);

      await expect(
        missionRequestService.closeById("missing-id", "note"),
      ).rejects.toMatchObject({
        message: "Không tìm thấy mission request với ID: missing-id",
        statusCode: 404,
        errorCode: "MISSION_REQUEST_NOT_FOUND",
      });

      expect(missionRequestRepository.updateStatusWithNote).not.toHaveBeenCalled();
    });
  });

  describe("dropById", () => {
    it("should reject dropping from terminal status", async () => {
      missionRequestRepository.findById.mockResolvedValue({
        _id: "mr-2",
        status: "CLOSED",
      });

      await expect(
        missionRequestService.dropById("mr-2", "manual handoff"),
      ).rejects.toMatchObject({
        message:
          "Không thể chuyển trạng thái mission request: trạng thái hiện tại CLOSED đã là trạng thái kết thúc",
        statusCode: 400,
        errorCode: "MISSION_REQUEST_TERMINAL",
      });

      expect(missionRequestRepository.updateStatusWithNote).not.toHaveBeenCalled();
    });
  });

  describe("syncRequestStatus", () => {
    it("should mark request PARTIALLY_FULFILLED when all mission requests are terminal but unmet", async () => {
      requestRepository.findRequestById.mockResolvedValue({
        _id: "req-1",
        status: "IN_PROGRESS",
      });
      missionRequestRepository.findByRequestId.mockResolvedValue([
        { status: "CLOSED" },
        { status: "DROPPED" },
      ]);

      const result = await missionRequestService.syncRequestStatus("req-1");

      expect(requestRepository.updateRequestStatus).toHaveBeenCalledWith(
        "req-1",
        "PARTIALLY_FULFILLED",
      );
      expect(result).toBe("PARTIALLY_FULFILLED");
    });
  });

  describe("syncMissionStatus", () => {
    it("should mark mission PARTIAL when all timelines are terminal but unmet targets remain", async () => {
      missionRepository.findById.mockResolvedValue({
        _id: "m-1",
        status: "IN_PROGRESS",
      });
      timelineRepository.findByMissionId.mockResolvedValue([
        { status: "COMPLETED" },
        { status: "PARTIAL" },
      ]);
      missionRequestRepository.findByMissionId.mockResolvedValue([
        { status: "CLOSED", fulfillmentPercent: 100 },
        { status: "CLOSED", fulfillmentPercent: 60 },
      ]);

      const result = await missionRequestService.syncMissionStatus("m-1");

      expect(missionRepository.update).toHaveBeenCalledWith("m-1", { status: "PARTIAL" });
      expect(result).toBe("PARTIAL");
    });
  });

  describe("updateProgress", () => {
    const baseMissionRequest = {
      _id: "mr-p",
      status: "IN_PROGRESS",
      missionId: "m-1",
      peopleNeeded: 5,
      requestSuppliesSnapshot: [],
    };

    it("should update progress through TeamRequest and sync aggregate as PARTIAL", async () => {
      const syncSpy = jest
        .spyOn(missionRequestService, "syncAfterMissionRequestUpdate")
        .mockResolvedValue();

      missionRequestRepository.findById.mockResolvedValue(baseMissionRequest);
      Timeline.exists.mockResolvedValue(true);
      teamRequestRepository.getContributionSummaryByMissionRequestId
        .mockResolvedValueOnce({
          totalRescued: 0,
          totalSuppliesDelivered: [],
          teamContributions: [],
        })
        .mockResolvedValueOnce({
          totalRescued: 3,
          totalSuppliesDelivered: [],
          teamContributions: [
            {
              teamId: "team-1",
              rescuedCountTotal: 3,
              suppliesDeliveredTotal: [],
            },
          ],
        });
      teamRequestRepository.upsertContribution.mockResolvedValue({ _id: "tr-1" });
      missionRequestRepository.syncAggregateFromContributionSummary.mockResolvedValue({
        _id: "mr-p",
        status: "PARTIAL",
        peopleRescued: 3,
        peopleNeeded: 5,
        fulfillmentPercent: 60,
        suppliesDelivered: [],
        missionId: "m-1",
      });

      const result = await missionRequestService.updateProgress(
        "mr-p",
        { peopleRescuedIncrement: 3 },
        { id: "u-1", role: "Rescue Team", teamId: "team-1" },
      );

      expect(Timeline.exists).toHaveBeenCalledWith({ missionId: "m-1", teamId: "team-1" });
      expect(teamRequestRepository.upsertContribution).toHaveBeenCalledWith({
        missionId: "m-1",
        missionRequestId: "mr-p",
        teamId: "team-1",
        peopleRescuedIncrement: 3,
        suppliesDelivered: [],
        updatedBy: "u-1",
      });
      expect(missionRequestRepository.syncAggregateFromContributionSummary).toHaveBeenCalledWith(
        "mr-p",
        expect.objectContaining({ totalRescued: 3 }),
      );
      expect(syncSpy).toHaveBeenCalled();
      expect(result.status).toBe("PARTIAL");
      expect(result.fulfillmentPercent).toBe(60);
    });

    it("should resolve to CLOSED when target is fully met", async () => {
      jest.spyOn(missionRequestService, "syncAfterMissionRequestUpdate").mockResolvedValue();

      missionRequestRepository.findById.mockResolvedValue(baseMissionRequest);
      Timeline.exists.mockResolvedValue(true);
      teamRequestRepository.getContributionSummaryByMissionRequestId
        .mockResolvedValueOnce({
          totalRescued: 0,
          totalSuppliesDelivered: [],
          teamContributions: [],
        })
        .mockResolvedValueOnce({
          totalRescued: 5,
          totalSuppliesDelivered: [],
          teamContributions: [
            {
              teamId: "team-1",
              rescuedCountTotal: 5,
              suppliesDeliveredTotal: [],
            },
          ],
        });
      teamRequestRepository.upsertContribution.mockResolvedValue({ _id: "tr-2" });
      missionRequestRepository.syncAggregateFromContributionSummary.mockResolvedValue({
        _id: "mr-p",
        status: "CLOSED",
        peopleRescued: 5,
        peopleNeeded: 5,
        fulfillmentPercent: 100,
        suppliesDelivered: [],
        missionId: "m-1",
      });

      const result = await missionRequestService.updateProgress(
        "mr-p",
        { peopleRescuedIncrement: 5 },
        { id: "u-1", role: "Rescue Team", teamId: "team-1" },
      );

      expect(result.status).toBe("CLOSED");
      expect(result.fulfillmentPercent).toBe(100);
    });

    it("should sync delivered supplies through aggregate recompute", async () => {
      jest.spyOn(missionRequestService, "syncAfterMissionRequestUpdate").mockResolvedValue();

      missionRequestRepository.findById.mockResolvedValue({
        ...baseMissionRequest,
        peopleNeeded: 0,
        requestSuppliesSnapshot: [{ name: "Water", requestedQty: 10 }],
      });
      Timeline.exists.mockResolvedValue(true);
      teamRequestRepository.getContributionSummaryByMissionRequestId
        .mockResolvedValueOnce({
          totalRescued: 0,
          totalSuppliesDelivered: [],
          teamContributions: [],
        })
        .mockResolvedValueOnce({
          totalRescued: 0,
          totalSuppliesDelivered: [{ name: "Water", deliveredQty: 10 }],
          teamContributions: [
            {
              teamId: "team-1",
              rescuedCountTotal: 0,
              suppliesDeliveredTotal: [{ name: "Water", deliveredQty: 10 }],
            },
          ],
        });
      teamRequestRepository.upsertContribution.mockResolvedValue({ _id: "tr-3" });
      missionRequestRepository.syncAggregateFromContributionSummary.mockResolvedValue({
        _id: "mr-p",
        status: "CLOSED",
        fulfillmentPercent: 100,
        suppliesDelivered: [{ name: "Water", deliveredQty: 10 }],
        missionId: "m-1",
      });

      const result = await missionRequestService.updateProgress(
        "mr-p",
        { suppliesDelivered: [{ name: "Water", deliveredQty: 10 }] },
        { id: "u-1", role: "Rescue Team", teamId: "team-1" },
      );

      expect(teamRequestRepository.upsertContribution).toHaveBeenCalledWith(
        expect.objectContaining({
          suppliesDelivered: [{ name: "Water", deliveredQty: 10 }],
        }),
      );
      expect(result.suppliesDelivered).toEqual([{ name: "Water", deliveredQty: 10 }]);
    });

    it("should reject over-delivery with 422", async () => {
      missionRequestRepository.findById.mockResolvedValue({
        ...baseMissionRequest,
        peopleNeeded: 0,
        requestSuppliesSnapshot: [{ name: "Water", requestedQty: 10 }],
      });
      Timeline.exists.mockResolvedValue(true);
      teamRequestRepository.getContributionSummaryByMissionRequestId.mockResolvedValueOnce({
        totalRescued: 0,
        totalSuppliesDelivered: [{ name: "Water", deliveredQty: 8 }],
        teamContributions: [],
      });

      await expect(
        missionRequestService.updateProgress(
          "mr-p",
          { suppliesDelivered: [{ name: "Water", deliveredQty: 3 }] },
          { id: "u-1", role: "Rescue Team", teamId: "team-1" },
        ),
      ).rejects.toMatchObject({
        statusCode: 422,
        errorCode: "SUPPLY_OVER_DELIVERY",
      });

      expect(teamRequestRepository.upsertContribution).not.toHaveBeenCalled();
      expect(missionRequestRepository.syncAggregateFromContributionSummary).not.toHaveBeenCalled();
    });

    it("should throw 403 USER_NOT_IN_TEAM when user has no teamId and DB returns null", async () => {
      missionRequestRepository.findById.mockResolvedValue(baseMissionRequest);
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        missionRequestService.updateProgress(
          "mr-p",
          { peopleRescuedIncrement: 1 },
          { id: "u-no-team", role: "Rescue Team" },
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        errorCode: "USER_NOT_IN_TEAM",
      });

      expect(teamRequestRepository.upsertContribution).not.toHaveBeenCalled();
    });

    it("should throw 403 TEAM_NOT_ASSIGNED_TO_MISSION when team has no timeline in mission", async () => {
      missionRequestRepository.findById.mockResolvedValue(baseMissionRequest);
      Timeline.exists.mockResolvedValue(false);

      await expect(
        missionRequestService.updateProgress(
          "mr-p",
          { peopleRescuedIncrement: 1 },
          { id: "u-1", role: "Rescue Team", teamId: "team-outsider" },
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        errorCode: "TEAM_NOT_ASSIGNED_TO_MISSION",
      });

      expect(teamRequestRepository.upsertContribution).not.toHaveBeenCalled();
    });

    it("should return 200 OK with message when missionRequest is already CLOSED", async () => {
      missionRequestRepository.findById.mockResolvedValue({
        _id: "mr-p",
        status: "CLOSED",
        missionId: "m-1",
        peopleRescued: 5,
        fulfillmentPercent: 100,
        toObject: function() { return { ...this }; },
      });

      const result = await missionRequestService.updateProgress(
        "mr-p",
        { peopleRescuedIncrement: 1 },
        { id: "u-1", role: "Rescue Team", teamId: "team-1" },
      );

      expect(result).toMatchObject({
        _id: "mr-p",
        status: "CLOSED",
        message: "Mission already completed",
      });
      expect(teamRequestRepository.upsertContribution).not.toHaveBeenCalled();
      expect(missionRequestRepository.syncAggregateFromContributionSummary).not.toHaveBeenCalled();
    });

    it("should retrieve teamId from DB when user.teamId not provided", async () => {
      jest.spyOn(missionRequestService, "syncAfterMissionRequestUpdate").mockResolvedValue();

      missionRequestRepository.findById.mockResolvedValue(baseMissionRequest);
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ teamId: "team-from-db" }),
      });
      Timeline.exists.mockResolvedValue(true);
      teamRequestRepository.getContributionSummaryByMissionRequestId
        .mockResolvedValueOnce({
          totalRescued: 0,
          totalSuppliesDelivered: [],
          teamContributions: [],
        })
        .mockResolvedValueOnce({
          totalRescued: 2,
          totalSuppliesDelivered: [],
          teamContributions: [
            {
              teamId: "team-from-db",
              rescuedCountTotal: 2,
              suppliesDeliveredTotal: [],
            },
          ],
        });
      teamRequestRepository.upsertContribution.mockResolvedValue({ _id: "tr-4" });
      missionRequestRepository.syncAggregateFromContributionSummary.mockResolvedValue({
        _id: "mr-p",
        status: "PARTIAL",
        missionId: "m-1",
      });

      await missionRequestService.updateProgress(
        "mr-p",
        { peopleRescuedIncrement: 2 },
        { id: "u-no-teamid-in-jwt", role: "Rescue Team" },
      );

      expect(teamRequestRepository.upsertContribution).toHaveBeenCalledWith(
        expect.objectContaining({ teamId: "team-from-db" }),
      );
    });
  });
});
