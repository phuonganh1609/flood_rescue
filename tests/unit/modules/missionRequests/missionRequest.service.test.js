import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule("../../../../src/modules/missionRequests/missionRequest.repository.js", () => ({
  missionRequestRepository: {
    findById: jest.fn(),
    updateStatusWithNote: jest.fn(),
    findByRequestId: jest.fn(),
    findByMissionId: jest.fn(),
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

const missionRequestService = (await import("../../../../src/modules/missionRequests/missionRequest.service.js")).default;
const { missionRequestRepository } = await import("../../../../src/modules/missionRequests/missionRequest.repository.js");

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
});
