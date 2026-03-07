import missionService from "./mission.service.js";
import responseUtils from "../../utils/response.js";

const { sendSuccess, sendError } = responseUtils;

class MissionController {
  async createMission(req, res) {
    try {
      const missionData = {
        ...req.body,
        coordinatorId: req.user.id,
      };
      const mission = await missionService.createMission(missionData);
      return sendSuccess(res, {
        data: mission,
        message: "Mission created successfully",
        statusCode: 201,
      });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  }

  async getMissions(req, res) {
    try {
      const result = await missionService.getMissions(req.query);
      return sendSuccess(res, {
        data: result.data,
        message: "Missions retrieved successfully",
        statusCode: 200,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  }

  async getMissionById(req, res) {
    try {
      const mission = await missionService.getMissionById(req.params.id);
      return sendSuccess(res, {
        data: mission,
        message: "Mission details retrieved successfully",
      });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  }

  async updateMission(req, res) {
    try {
      const mission = await missionService.updateMission(
        req.params.id,
        req.body,
      );
      return sendSuccess(res, {
        data: mission,
        message: "Mission updated successfully",
      });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  }

  async deleteMission(req, res) {
    try {
      await missionService.deleteMission(req.params.id);
      return sendSuccess(res, {
        data: null,
        message: "Mission deleted successfully",
      });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  }

  async assignTeam(req, res) {
    try {
      const { teamId, requestId, note } = req.body;
      const timeline = await missionService.assignTeam(req.params.id, {
        teamId,
        requestId,
        note,
      });
      return sendSuccess(res, {
        data: timeline,
        message: "Team assigned successfully",
        statusCode: 200,
      });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  }

  async pauseMission(req, res) {
    try {
      const mission = await missionService.pauseMission(req.params.id);
      return sendSuccess(res, { data: mission, message: "Mission paused" });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  }

  async resumeMission(req, res) {
    try {
      const mission = await missionService.resumeMission(req.params.id);
      return sendSuccess(res, { data: mission, message: "Mission resumed" });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  }

  async abortMission(req, res) {
    try {
      const mission = await missionService.abortMission(req.params.id);
      return sendSuccess(res, { data: mission, message: "Mission aborted" });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
    }
  }
}

export default new MissionController();
