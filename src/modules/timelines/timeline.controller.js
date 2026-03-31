import mongoose from "mongoose";
import timelineService from "./timeline.service.js";
import responseUtils from "../../utils/response.js";

const { sendSuccess, sendError } = responseUtils;

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseTimelineId(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    sendError(res, {
      message: "ID timeline không hợp lệ",
      statusCode: 400,
      errorCode: "INVALID_TIMELINE_ID",
    });
    return null;
  }
  return id;
}

class TimelineController {
  static toErrorPayload(error) {
    return {
      message: error.message || "Có lỗi nội bộ xảy ra",
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || "INTERNAL_ERROR",
    };
  }

  async getTimelines(req, res) {
    try {
      const result = await timelineService.getTimelines(req.query, req.user);
      return sendSuccess(res, {
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        message: "Timelines retrieved successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async getTimelineById(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.getTimelineById(timelineId);

      // Rescue team can only access timelines of their own team.
      if (req.user.role === "Rescue Team") {
        const actorTeamId = await timelineService.getUserTeamId(req.user.id);
        const timelineTeamId = timeline.teamId?._id?.toString?.() || timeline.teamId?.toString?.();
        if (!actorTeamId || actorTeamId !== timelineTeamId) {
          return sendError(res, {
            message: "Bạn không có quyền truy cập timeline này",
            statusCode: 403,
            errorCode: "UNAUTHORIZED_TIMELINE_ACCESS",
          });
        }
      }

      return sendSuccess(res, {
        data: timeline,
        message: "Timeline retrieved successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async accept(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.acceptTimeline(timelineId, req.user.id);
      return sendSuccess(res, {
        data: timeline,
        message: "Timeline accepted successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async confirmSupplyClaim(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.confirmSupplyClaim(timelineId, req.user.id, req.body);
      return sendSuccess(res, {
        data: timeline,
        message: "Supply claim confirmed successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async arrive(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.arriveTimeline(timelineId, req.user.id);
      return sendSuccess(res, {
        data: timeline,
        message: "Timeline marked ON_SITE successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async complete(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.completeTimeline(timelineId, req.user.id, req.body);
      return sendSuccess(res, {
        data: timeline,
        message: "Timeline completed successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async fail(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.failTimeline(timelineId, req.user.id, req.body);
      return sendSuccess(res, {
        data: timeline,
        message: "Timeline marked failed successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async withdraw(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.withdrawTimeline(timelineId, req.user.id, req.body);
      return sendSuccess(res, {
        data: timeline,
        message: "Timeline withdrawn successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async cancel(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.cancelTimeline(timelineId, req.body);
      return sendSuccess(res, {
        data: timeline,
        message: "Timeline cancelled successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async completeFromTeamRequests(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.completeTimelineFromAllTeamRequests(
        timelineId,
        req.user.id,
        req.body,
      );
      return sendSuccess(res, {
        data: timeline,
        message: "Timeline completed from team requests successfully",
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }

  async completeAuto(req, res) {
    const timelineId = parseTimelineId(req, res);
    if (!timelineId) return;

    try {
      const timeline = await timelineService.completeTimelineAuto(
        timelineId,
        req.user.id,
        req.body,
      );

      const message = timeline._alreadyCompleted
        ? timeline.message || "Timeline đã được hoàn tất trước đó"
        : "Timeline completed successfully";

      const responseData = timeline.toObject ? timeline.toObject() : { ...timeline };
      delete responseData._alreadyCompleted;
      delete responseData.message;

      return sendSuccess(res, {
        data: responseData,
        message: message,
      });
    } catch (error) {
      return sendError(res, TimelineController.toErrorPayload(error));
    }
  }
}

export default new TimelineController();

