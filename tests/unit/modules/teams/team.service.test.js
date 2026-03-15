import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.unstable_mockModule("../../../../src/modules/teams/team.repository.js", () => ({
  teamRepository: {
    findByIdWithStats: jest.fn(),
    findAllWithStats: jest.fn(),
    findByName: jest.fn(),
    createTeam: jest.fn(),
    findById: jest.fn(),
    findMembers: jest.fn(),
    updateTeam: jest.fn(),
    deleteTeam: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateLeader: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/users/user.model.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../../src/modules/timelines/timeline.model.js", () => ({
  default: {
    countDocuments: jest.fn(),
  },
}));

const { teamService } = await import("../../../../src/modules/teams/team.service.js");
const { teamRepository } = await import("../../../../src/modules/teams/team.repository.js");

describe("TeamService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTeamById", () => {
    it("should return team with teamLeader and memberStats", async () => {
      const mockTeam = {
        _id: "team-001",
        name: "Alpha",
        teamLeader: { _id: "u1", displayName: "Leader" },
        memberStats: { total: 5, rescue: 4, active: 3 },
      };

      teamRepository.findByIdWithStats.mockResolvedValue(mockTeam);

      const result = await teamService.getTeamById("team-001");

      expect(teamRepository.findByIdWithStats).toHaveBeenCalledWith("team-001");
      expect(result).toEqual(mockTeam);
    });

    it("should throw when team not found", async () => {
      teamRepository.findByIdWithStats.mockResolvedValue(null);

      await expect(teamService.getTeamById("missing")).rejects.toThrow("Team not found");
    });
  });

  describe("getAllTeams", () => {
    it("should pass filter/pagination/sort/options to repository", async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      const filter = { status: "AVAILABLE" };
      const pagination = { page: 1, limit: 10 };
      const sort = { "memberStats.active": -1 };
      const options = { active: 2, leader: "An" };

      teamRepository.findAllWithStats.mockResolvedValue(mockResult);

      const result = await teamService.getAllTeams(filter, pagination, sort, options);

      expect(teamRepository.findAllWithStats).toHaveBeenCalledWith(
        filter,
        pagination,
        sort,
        options,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
