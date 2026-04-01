import response from '../../utils/response.js';
import { timelineSupplyService } from './timelineSupply.service.js';

export const getTimelineSupplies = async (req, res) => {
  try {
    const { timelineId } = req.query;

    if (!timelineId) {
      return response.sendError(res, {
        message: "Missing required query param: timelineId",
        statusCode: 400,
        errorCode: "MISSING_TIMELINE_ID",
      });
    }

    const data = await timelineSupplyService.getTimelineSupplies(timelineId);
    return response.sendSuccess(res, {
      data,
      message: "Timeline supplies fetched successfully",
    });
  } catch (error) {
    return response.sendError(res, {
      message: error.message,
      statusCode: 500,
      errorCode: "GET_TIMELINE_SUPPLIES_FAILED",
    });
  }
};

export const claimSupply = async (req, res) => {
  try {
    const { timelineId, missionSupplyId, carriedQty } = req.body;

    if (!timelineId || !missionSupplyId || carriedQty === undefined) {
      return response.sendError(res, {
        message: "Missing required fields: timelineId, missionSupplyId, carriedQty",
        statusCode: 400,
      });
    }

    const result = await timelineSupplyService.claimSupply(timelineId, missionSupplyId, Number(carriedQty));

    return response.sendSuccess(res, {
      data: result,
      message: "Supply claimed successfully",
      statusCode: 201,
    });
  } catch (err) {
    console.error(err);
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};

export const returnSupply = async (req, res) => {
  try {
    const { timelineId, missionSupplyId } = req.body;

    if (!timelineId || !missionSupplyId) {
      return response.sendError(res, {
        message: "Missing required fields: timelineId, missionSupplyId",
        statusCode: 400,
      });
    }

    const result = await timelineSupplyService.returnSupply(timelineId, missionSupplyId);

    return response.sendSuccess(res, {
      data: result,
      message: "Supply returned successfully",
    });
  } catch (err) {
    console.error(err);
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};
