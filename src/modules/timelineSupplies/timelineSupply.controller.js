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
    const { id } = req.params;

    const result = await timelineSupplyService.claimSupply(id);

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
    const { id } = req.params;

    const result = await timelineSupplyService.returnSupply(id);

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

export const approveSupply = async (req, res) => {
  try {
    const { id } = req.params;
    const approvalData = req.body;

    const result = await timelineSupplyService.approveSupply(id, approvalData);

    return response.sendSuccess(res, {
      data: result,
      message: "Supply approved successfully",
    });
  } catch (err) {
    console.error(err);
    return response.sendError(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
    });
  }
};

export const rejectSupply = async (req, res) => {
  try {
    const { id } = req.params;
    const rejectionData = req.body;

    const result = await timelineSupplyService.rejectSupply(id, rejectionData);

    return response.sendSuccess(res, {
      data: result,
      message: "Supply rejected successfully",
    });
  } catch (err) {
    console.error(err);
    return response.sendError(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
    });
  }
};
