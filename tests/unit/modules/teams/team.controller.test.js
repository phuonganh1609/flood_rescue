import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule("../../../../src/modules/teams/team.service.js", () => ({
  teamService: {
    getAllTeams: jest.fn(),
    getTeamById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/utils/response.js", () => ({
  default: {
    sendSuccess: jest.fn(),
    sendError: jest.fn(),
  },
}));

const teamController = await import("../../../../src/modules/teams/team.controller.js");
const { teamService } = await import("../../../../src/modules/teams/team.service.js");
const response = (await import("../../../../src/utils/response.js")).default;

describe("TeamController", () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {};
    response.sendSuccess.mockReturnValue(mockRes);
    response.sendError.mockReturnValue(mockRes);
  });

  describe("getAllTeams", () => {
    it("should map active and leader filters plus active sort", async () => {
      const req = {
        query: {
          page: "2",
          limit: "5",
          status: "AVAILABLE",
          name: "alp",
          active: "3",
          leader: "an",
          sortBy: "active",
          order: "asc",
        },
      };

      teamService.getAllTeams.mockResolvedValue({
        data: [{ _id: "t1" }],
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      });

      await teamController.getAllTeams(req, mockRes);

      expect(teamService.getAllTeams).toHaveBeenCalledWith(
        {
          status: "AVAILABLE",
          name: { $regex: "alp", $options: "i" },
        },
        { page: 2, limit: 5 },
        { "memberStats.active": 1 },
        { active: 3, leader: "an" },
      );

      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, {
        data: [{ _id: "t1" }],
        meta: {
          total: 1,
          page: 2,
          limit: 5,
          totalPages: 1,
        },
      });
    });

    it("should map leader sort to teamLeader.displayName", async () => {
      const req = {
        query: {
          sortBy: "leader",
          order: "desc",
        },
      };

      teamService.getAllTeams.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      await teamController.getAllTeams(req, mockRes);

      expect(teamService.getAllTeams).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 10 },
        { "teamLeader.displayName": -1 },
        {},
      );
    });

    it("should return 400 when active is invalid", async () => {
      const req = {
        query: {
          active: "-2",
        },
      };

      await teamController.getAllTeams(req, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, {
        message: "active must be a non-negative integer",
        statusCode: 400,
      });
      expect(teamService.getAllTeams).not.toHaveBeenCalled();
    });
  });

  describe("getTeam", () => {
    it("should return 400 when teamId is invalid", async () => {
      const req = { params: { teamId: "invalid" } };

      await teamController.getTeam(req, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, {
        message: "Invalid team ID",
        statusCode: 400,
      });
    });

    it("should return team detail when found", async () => {
      const req = { params: { teamId: "507f1f77bcf86cd799439011" } };
      const team = {
        _id: "507f1f77bcf86cd799439011",
        teamLeader: null,
        memberStats: { total: 0, rescue: 0, active: 0 },
      };

      teamService.getTeamById.mockResolvedValue(team);

      await teamController.getTeam(req, mockRes);

      expect(teamService.getTeamById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(response.sendSuccess).toHaveBeenCalledWith(mockRes, { data: team });
    });

    it("should return 500 with clear message for unexpected errors", async () => {
      const req = { params: { teamId: "507f1f77bcf86cd799439011" } };

      teamService.getTeamById.mockRejectedValue(new Error("Cannot read properties of null"));

      await teamController.getTeam(req, mockRes);

      expect(response.sendError).toHaveBeenCalledWith(mockRes, {
        message: "Unexpected error while processing team request",
        statusCode: 500,
      });
    });
  });
});
