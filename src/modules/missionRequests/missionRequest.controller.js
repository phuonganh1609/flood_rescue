import missionRequestService from "./missionRequest.service.js";
import responseUtils from "../../utils/response.js";

const { sendSuccess, sendError } = responseUtils;

class MissionRequestController {
  static toErrorPayload(error) {
    return {
      message: error.message || "Có lỗi nội bộ xảy ra",
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || "INTERNAL_ERROR",
    };
  }

  async getAll(req, res) {
    try {
      // Support split by comma if pass from query string: ?status=PENDING,IN_PROGRESS
      const { status, limit, page, sort } = req.query;
      let statusFilter = status;
      if (typeof status === "string" && status.includes(",")) {
        statusFilter = status.split(",");
      }

      const data = await missionRequestService.getAll({
        status: statusFilter,
        limit,
        page,
        sort,
      });

      return sendSuccess(res, {
        data,
        message: "Mission requests retrieved successfully",
      });
    } catch (error) {
      return sendError(res, MissionRequestController.toErrorPayload(error));
    }
  }

  async getById(req, res) {
    try {
      const data = await missionRequestService.getById(req.params.id);
      return sendSuccess(res, {
        data,
        message: "Mission request retrieved successfully",
      });
    } catch (error) {
      return sendError(res, MissionRequestController.toErrorPayload(error));
    }
  }

  async closeById(req, res) {
    try {
      const data = await missionRequestService.closeById(
        req.params.id,
        req.body.note,
      );
      return sendSuccess(res, {
        data,
        message: "Mission request closed successfully",
      });
    } catch (error) {
      return sendError(res, MissionRequestController.toErrorPayload(error));
    }
  }

  async dropById(req, res) {
    try {
      const data = await missionRequestService.dropById(
        req.params.id,
        req.body.note,
      );
      return sendSuccess(res, {
        data,
        message: "Mission request dropped successfully",
      });
    } catch (error) {
      return sendError(res, MissionRequestController.toErrorPayload(error));
    }
  }

  async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { peopleRescuedIncrement, suppliesDelivered } = req.body;
      const data = await missionRequestService.updateProgress(
        id,
        { peopleRescuedIncrement, suppliesDelivered },
        req.user,
      );
      return sendSuccess(res, {
        data,
        message: "Mission request progress updated successfully",
      });
    } catch (error) {
      return sendError(res, MissionRequestController.toErrorPayload(error));
    }
  }
}

export default new MissionRequestController();
