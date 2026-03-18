import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const userFindByIdMock = jest.fn();
const eventEmitMock = jest.fn();

jest.unstable_mockModule(
  "../../../../src/modules/teamApplications/teamApplication.repository.js",
  () => ({
    teamApplicationRepository: {
      create: jest.fn(),
      findPendingByUserId: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      updateById: jest.fn(),
    },
  }),
);

jest.unstable_mockModule("../../../../src/modules/users/user.model.js", () => ({
  default: {
    findById: userFindByIdMock,
  },
}));

jest.unstable_mockModule("../../../../src/modules/users/user.repository.js", () => ({
  userRepository: {
    updateRole: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/utils/events.js", () => ({
  eventBus: {
    emit: eventEmitMock,
  },
}));

const { teamApplicationService } = await import(
  "../../../../src/modules/teamApplications/teamApplication.service.js"
);
const { teamApplicationRepository } = await import(
  "../../../../src/modules/teamApplications/teamApplication.repository.js"
);
const { userRepository } = await import(
  "../../../../src/modules/users/user.repository.js"
);

describe("TeamApplicationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("submitApplication", () => {
    it("should submit application using profile phone when confirmPhoneNumber is omitted", async () => {
      userFindByIdMock.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          displayName: "Citizen A",
          userName: "citizen-a",
          phoneNumber: "0909000111",
          role: "Citizen",
          isActive: true,
        }),
      });
      teamApplicationRepository.findPendingByUserId.mockResolvedValue(null);
      teamApplicationRepository.create.mockResolvedValue({
        _id: "app-001",
      });
      teamApplicationRepository.findById.mockResolvedValue({
        _id: "app-001",
        submittedPhoneNumber: "0909000111",
      });

      const result = await teamApplicationService.submitApplication(
        "507f1f77bcf86cd799439011",
        { motivation: "I want to support rescue missions in my area." },
      );

      expect(teamApplicationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "507f1f77bcf86cd799439011",
          submittedPhoneNumber: "0909000111",
        }),
      );
      expect(eventEmitMock).toHaveBeenCalledWith(
        "TEAM_APPLICATION_SUBMITTED",
        expect.objectContaining({
          applicationId: "app-001",
          citizenId: "507f1f77bcf86cd799439011",
        }),
      );
      expect(result).toEqual({
        _id: "app-001",
        submittedPhoneNumber: "0909000111",
      });
    });

    it("should reject duplicate pending application", async () => {
      userFindByIdMock.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          phoneNumber: "0909000111",
          role: "Citizen",
          isActive: true,
        }),
      });
      teamApplicationRepository.findPendingByUserId.mockResolvedValue({ _id: "pending-1" });

      await expect(
        teamApplicationService.submitApplication("507f1f77bcf86cd799439011", {
          motivation: "I want to support rescue missions in my area.",
        }),
      ).rejects.toThrow("You already have a pending rescue team application");
    });
  });

  describe("approveApplication", () => {
    it("should approve pending application and update user role", async () => {
      teamApplicationRepository.findById.mockResolvedValue({
        _id: "app-001",
        status: "PENDING",
        userId: {
          _id: "507f1f77bcf86cd799439011",
          displayName: "Citizen A",
        },
      });
      userFindByIdMock.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          role: "Citizen",
          isActive: true,
        }),
      });
      teamApplicationRepository.updateById.mockResolvedValue({
        _id: "app-001",
        status: "APPROVED",
      });

      const result = await teamApplicationService.approveApplication("app-001", {
        id: "reviewer-1",
        role: "Rescue Coordinator",
        displayName: "Coordinator A",
      });

      expect(userRepository.updateRole).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        "Rescue Team",
      );
      expect(teamApplicationRepository.updateById).toHaveBeenCalledWith(
        "app-001",
        expect.objectContaining({
          status: "APPROVED",
          reviewedBy: "reviewer-1",
        }),
      );
      expect(eventEmitMock).toHaveBeenCalledWith(
        "TEAM_APPLICATION_APPROVED",
        expect.objectContaining({
          applicationId: "app-001",
          citizenId: "507f1f77bcf86cd799439011",
        }),
      );
      expect(result).toEqual({ _id: "app-001", status: "APPROVED" });
    });
  });

  describe("withdrawApplication", () => {
    it("should allow owner to withdraw pending application", async () => {
      teamApplicationRepository.findById.mockResolvedValue({
        _id: "app-001",
        status: "PENDING",
        userId: {
          _id: "507f1f77bcf86cd799439011",
          displayName: "Citizen A",
        },
      });
      teamApplicationRepository.updateById.mockResolvedValue({
        _id: "app-001",
        status: "WITHDRAWN",
      });

      const result = await teamApplicationService.withdrawApplication("app-001", {
        id: "507f1f77bcf86cd799439011",
      });

      expect(teamApplicationRepository.updateById).toHaveBeenCalledWith(
        "app-001",
        expect.objectContaining({
          status: "WITHDRAWN",
        }),
      );
      expect(eventEmitMock).toHaveBeenCalledWith(
        "TEAM_APPLICATION_WITHDRAWN",
        expect.objectContaining({ applicationId: "app-001" }),
      );
      expect(result).toEqual({ _id: "app-001", status: "WITHDRAWN" });
    });
  });
});
