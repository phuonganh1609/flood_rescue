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
}

export default new MissionRequestController();
