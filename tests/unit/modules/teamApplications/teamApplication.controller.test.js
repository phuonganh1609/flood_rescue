import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.unstable_mockModule(
  "../../../../src/modules/teamApplications/teamApplication.service.js",
  () => ({
    teamApplicationService: {
      submitApplication: jest.fn(),
      listOwnApplications: jest.fn(),
      listAllApplications: jest.fn(),
      getApplicationById: jest.fn(),
      withdrawApplication: jest.fn(),
      approveApplication: jest.fn(),
      rejectApplication: jest.fn(),
    },
  }),
);

jest.unstable_mockModule("../../../../src/utils/response.js", () => ({
  default: {
    sendSuccess: jest.fn(),
    sendError: jest.fn(),
  },
}));

const controller = await import(
  "../../../../src/modules/teamApplications/teamApplication.controller.js"
);
const { teamApplicationService } = await import(
  "../../../../src/modules/teamApplications/teamApplication.service.js"
);
const response = (await import("../../../../src/utils/response.js")).default;

describe("TeamApplicationController", () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {};
    response.sendSuccess.mockReturnValue(mockRes);
    response.sendError.mockReturnValue(mockRes);
  });

  it("should submit application successfully", async () => {
    const req = {
      user: { id: "u1" },
      body: { motivation: "I want to support rescue missions in my area." },
    };
    const application = { _id: "app-001", status: "PENDING" };
    teamApplicationService.submitApplication.mockResolvedValue(application);

    await controller.submitTeamApplication(req, mockRes);

    expect(teamApplicationService.submitApplication).toHaveBeenCalledWith("u1", req.body);
    expect(response.sendSuccess).toHaveBeenCalledWith(
      mockRes,
      expect.objectContaining({
        data: application,
        statusCode: 201,
      }),
    );
  });

  it("should return 403 for forbidden application access", async () => {
    const req = {
      params: { applicationId: "507f1f77bcf86cd799439011" },
      user: { id: "u1", role: "Citizen" },
    };
    teamApplicationService.getApplicationById.mockRejectedValue(
      new Error("You are not allowed to access this application"),
    );

    await controller.getTeamApplication(req, mockRes);

    expect(response.sendError).toHaveBeenCalledWith(mockRes, {
      message: "You are not allowed to access this application",
      statusCode: 403,
    });
  });

  it("should return paginated own applications", async () => {
    const req = {
      user: { id: "u1" },
      query: { page: 1, limit: 10 },
    };
    teamApplicationService.listOwnApplications.mockResolvedValue({
      data: [{ _id: "app-001" }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    await controller.getMyTeamApplications(req, mockRes);

    expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, {
      data: [{ _id: "app-001" }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      message: "Team applications retrieved successfully",
    });
  });
});
