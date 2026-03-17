import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule("../../../../src/modules/missionRequests/missionRequest.repository.js", () => ({
  missionRequestRepository: {
    findById: jest.fn(),
    updateStatusWithNote: jest.fn(),
    findByRequestId: jest.fn(),
    findByMissionId: jest.fn(),
    updateProgress: jest.fn(),
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
    FULFILLED: "FULFILLED",
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.repository.js", () => ({
  EXECUTING_TIMELINE_STATUSES: ["EN_ROUTE", "ON_SITE"],
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
      expect(syncSpy).toHaveBeenCalledWith(expect.objectContaining({ _id: "mr-1", status: "CLOSED" }));
      expect(result).toEqual(expect.objectContaining({ status: "CLOSED" }));
    });

    it("should throw 404 when mission request is missing", async () => {
      missionRequestRepository.findById.mockResolvedValue(null);

      await expect(missionRequestService.closeById("missing-id", "note")).rejects.toMatchObject({
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
        status: "FULFILLED",
      });

      await expect(missionRequestService.dropById("mr-2", "manual handoff")).rejects.toMatchObject({
        message:
          "Không thể chuyển trạng thái mission request: trạng thái hiện tại FULFILLED đã là trạng thái kết thúc",
        statusCode: 400,
        errorCode: "MISSION_REQUEST_TERMINAL",
      });

      expect(missionRequestRepository.updateStatusWithNote).not.toHaveBeenCalled();
    });
  });

  describe("updateProgress", () => {
    const baseMissionRequest = {
      _id: "mr-p",
      status: "IN_PROGRESS",
      missionId: "m-1",
    };

    it("should update progress and return PARTIAL status when people partially rescued", async () => {
      const syncSpy = jest
        .spyOn(missionRequestService, "syncAfterMissionRequestUpdate")
        .mockResolvedValue();

      missionRequestRepository.findById.mockResolvedValue(baseMissionRequest);
      Timeline.exists.mockResolvedValue(true);
      missionRequestRepository.updateProgress.mockResolvedValue({
        _id: "mr-p",
        status: "PARTIAL",
        peopleRescued: 3,
        peopleNeeded: 5,
        fulfillmentPercent: 60,
        suppliesDelivered: [],
        missionId: "m-1",
      });

      const user = { id: "u-1", role: "Rescue Team", teamId: "team-1" };
      const result = await missionRequestService.updateProgress(
        "mr-p",
        { peopleRescuedIncrement: 3 },
        user,
      );

      expect(Timeline.exists).toHaveBeenCalledWith({ missionId: "m-1", teamId: "team-1" });
      expect(missionRequestRepository.updateProgress).toHaveBeenCalledWith("mr-p", {
        peopleRescuedIncrement: 3,
        suppliesDelivered: [],
        teamId: "team-1",
      });
      expect(syncSpy).toHaveBeenCalled();
      expect(result.status).toBe("PARTIAL");
      expect(result.fulfillmentPercent).toBe(60);
    });

    it("should resolve to FULFILLED when people fully rescued", async () => {
      jest.spyOn(missionRequestService, "syncAfterMissionRequestUpdate").mockResolvedValue();

      missionRequestRepository.findById.mockResolvedValue(baseMissionRequest);
      Timeline.exists.mockResolvedValue(true);
      missionRequestRepository.updateProgress.mockResolvedValue({
        _id: "mr-p",
        status: "FULFILLED",
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

      expect(result.status).toBe("FULFILLED");
      expect(result.fulfillmentPercent).toBe(100);
    });

    it("should update suppliesDelivered array", async () => {
      jest.spyOn(missionRequestService, "syncAfterMissionRequestUpdate").mockResolvedValue();

      missionRequestRepository.findById.mockResolvedValue(baseMissionRequest);
      Timeline.exists.mockResolvedValue(true);
      missionRequestRepository.updateProgress.mockResolvedValue({
        _id: "mr-p",
        status: "PARTIAL",
        suppliesDelivered: [{ name: "Water", deliveredQty: 10 }],
        missionId: "m-1",
      });

      const result = await missionRequestService.updateProgress(
        "mr-p",
        { suppliesDelivered: [{ name: "Water", deliveredQty: 10 }] },
        { id: "u-1", role: "Rescue Team", teamId: "team-1" },
      );

      expect(missionRequestRepository.updateProgress).toHaveBeenCalledWith("mr-p", {
        peopleRescuedIncrement: 0,
        suppliesDelivered: [{ name: "Water", deliveredQty: 10 }],
        teamId: "team-1",
      });
      expect(result.suppliesDelivered).toEqual([{ name: "Water", deliveredQty: 10 }]);
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

      expect(missionRequestRepository.updateProgress).not.toHaveBeenCalled();
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

      expect(missionRequestRepository.updateProgress).not.toHaveBeenCalled();
    });

    it("should throw 400 MISSION_REQUEST_TERMINAL when missionRequest is already FULFILLED", async () => {
      missionRequestRepository.findById.mockResolvedValue({
        _id: "mr-p",
        status: "FULFILLED",
        missionId: "m-1",
      });

      await expect(
        missionRequestService.updateProgress(
          "mr-p",
          { peopleRescuedIncrement: 1 },
          { id: "u-1", role: "Rescue Team", teamId: "team-1" },
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "MISSION_REQUEST_TERMINAL",
      });

      expect(missionRequestRepository.updateProgress).not.toHaveBeenCalled();
    });

    it("should retrieve teamId from DB when user.teamId not provided", async () => {
      jest.spyOn(missionRequestService, "syncAfterMissionRequestUpdate").mockResolvedValue();

      missionRequestRepository.findById.mockResolvedValue(baseMissionRequest);
      UserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ teamId: "team-from-db" }),
      });
      Timeline.exists.mockResolvedValue(true);
      missionRequestRepository.updateProgress.mockResolvedValue({
        _id: "mr-p",
        status: "PARTIAL",
        missionId: "m-1",
      });

      await missionRequestService.updateProgress(
        "mr-p",
        { peopleRescuedIncrement: 2 },
        { id: "u-no-teamid-in-jwt", role: "Rescue Team" },
      );

      expect(missionRequestRepository.updateProgress).toHaveBeenCalledWith(
        "mr-p",
        expect.objectContaining({ teamId: "team-from-db" }),
      );
    });
  });
});
