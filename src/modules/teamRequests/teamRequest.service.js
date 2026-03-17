import User from "../users/user.model.js";
import { teamRequestRepository } from "./teamRequest.repository.js";

class TeamRequestService {
  async getById(id, user = null) {
    const item = await teamRequestRepository.findById(id);
    if (!item) {
      const err = new Error("Team request not found");
      err.statusCode = 404;
      throw err;
    }

    if (user?.role === "Rescue Team") {
      const myTeamId = user.teamId || (await User.findById(user.id).select("teamId"))?.teamId;
      const itemTeamId = item.teamId?._id?.toString?.() || item.teamId?.toString?.();

      if (!myTeamId || myTeamId.toString() !== itemTeamId) {
        const err = new Error("Access denied");
        err.statusCode = 403;
        throw err;
      }
    }

    return item;
  }

  async getAll(query = {}, user = null) {
    const {
      missionId,
      missionRequestId,
      teamId,
      page = 1,
      limit = 10,
    } = query;

    const filter = {};
    if (missionId) filter.missionId = missionId;
    if (missionRequestId) filter.missionRequestId = missionRequestId;

    let resolvedTeamId = teamId;

    // Rescue Team only sees their own records
    if (user?.role === "Rescue Team") {
      resolvedTeamId = user.teamId || (await User.findById(user.id).select("teamId"))?.teamId;
    }

    if (resolvedTeamId) {
      filter.teamId = resolvedTeamId;
    }

    return await teamRequestRepository.findAll(
      filter,
      { page: parseInt(page), limit: parseInt(limit) },
      { lastUpdatedAt: -1, createdAt: -1 },
    );
  }

  async createMatrix(payload) {
    return await teamRequestRepository.createMatrix(payload);
  }
}

const teamRequestService = new TeamRequestService();

export { teamRequestService };
