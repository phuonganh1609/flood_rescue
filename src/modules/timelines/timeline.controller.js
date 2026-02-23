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
    sendError(res, { message: "Invalid timeline ID", statusCode: 400 });
    return null;
  }
  return id;
}

class TimelineController {
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
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
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
          return sendError(res, { message: "Access denied", statusCode: 403 });
        }
      }

      return sendSuccess(res, {
        data: timeline,
        message: "Timeline retrieved successfully",
      });
    } catch (error) {
      return sendError(res, {
        message: error.message,
        statusCode: error.statusCode || 500,
      });
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
      return sendError(res, { message: error.message, statusCode: error.statusCode || 500 });
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
      return sendError(res, { message: error.message, statusCode: error.statusCode || 500 });
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
      return sendError(res, { message: error.message, statusCode: error.statusCode || 500 });
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
      return sendError(res, { message: error.message, statusCode: error.statusCode || 500 });
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
      return sendError(res, { message: error.message, statusCode: error.statusCode || 500 });
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
      return sendError(res, { message: error.message, statusCode: error.statusCode || 500 });
    }
  }
}

export default new TimelineController();

