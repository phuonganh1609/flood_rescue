import missionService from "./mission.service.js";
import responseUtils from "../../utils/response.js";

const { sendSuccess, sendError } = responseUtils;

class MissionController {
  static toErrorPayload(error) {
    return {
      message: error.message || "Có lỗi nội bộ xảy ra",
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || "INTERNAL_ERROR",
    };
  }

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
      return sendError(res, MissionController.toErrorPayload(error));
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
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async getMissionById(req, res) {
    try {
      const mission = await missionService.getMissionById(req.params.id, req.user);
      return sendSuccess(res, {
        data: mission,
        message: "Mission details retrieved successfully",
      });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async getMissionRequests(req, res) {
    try {
      const result = await missionService.getMissionRequests(
        req.params.id,
        req.query,
        req.user,
      );
      return sendSuccess(res, {
        data: result.data,
        message: "Mission requests retrieved successfully",
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
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
      return sendError(res, MissionController.toErrorPayload(error));
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
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async addRequests(req, res) {
    try {
      const { requestIds, note } = req.body;
      const missionRequests = await missionService.addRequestsToMission(req.params.id, {
        requestIds,
        note,
      });
      return sendSuccess(res, {
        data: {
          addedCount: missionRequests.length,
          missionRequests: missionRequests,
        },
        message: "Requests added to mission successfully",
        statusCode: 200,
      });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async addTeams(req, res) {
    try {
      const { teamIds, note } = req.body;
      const timelines = await missionService.assignTeamsToMission(req.params.id, {
        teamIds,
        note,
      });
      return sendSuccess(res, {
        data: {
          addedCount: timelines.length,
          timelines: timelines,
        },
        message: "Teams assigned to mission successfully",
        statusCode: 200,
      });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async removeRequest(req, res) {
    try {
      const data = await missionService.removeRequestFromMission(
        req.params.id,
        req.params.requestId,
      );
      return sendSuccess(res, {
        data,
        message: "Request removed from mission successfully",
        statusCode: 200,
      });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async removeTeam(req, res) {
    try {
      const data = await missionService.removeTeamFromMission(
        req.params.id,
        req.params.teamId,
      );
      return sendSuccess(res, {
        data,
        message: "Team removed from mission successfully",
        statusCode: 200,
      });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async startMission(req, res) {
    try {
      const mission = await missionService.startMission(req.params.id, req.user.id);
      return sendSuccess(res, {
        data: mission,
        message: "Mission started successfully",
        statusCode: 200,
      });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async pauseMission(req, res) {
    try {
      const mission = await missionService.pauseMission(req.params.id);
      return sendSuccess(res, { data: mission, message: "Mission paused" });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async resumeMission(req, res) {
    try {
      const mission = await missionService.resumeMission(req.params.id);
      return sendSuccess(res, { data: mission, message: "Mission resumed" });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }

  async abortMission(req, res) {
    try {
      const mission = await missionService.abortMission(req.params.id);
      return sendSuccess(res, { data: mission, message: "Mission aborted" });
    } catch (error) {
      return sendError(res, MissionController.toErrorPayload(error));
    }
  }
}

export default new MissionController();
