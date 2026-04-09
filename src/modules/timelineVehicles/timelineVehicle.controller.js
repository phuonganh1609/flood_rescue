import response from '../../utils/response.js';
import { timelineVehicleService } from './timelineVehicle.service.js';

export const getTimelineVehicles = async (req, res) => {
  try {
    const { timelineId } = req.query;

    if (!timelineId) {
      return response.sendError(res, {
        message: "Missing required query param: timelineId",
        statusCode: 400,
        errorCode: "MISSING_TIMELINE_ID",
      });
    }

    const data = await timelineVehicleService.getTimelineVehicles(timelineId);
    return response.sendSuccess(res, {
      data,
      message: "Timeline vehicles fetched successfully",
    });
  } catch (error) {
    return response.sendError(res, {
      message: error.message,
      statusCode: 500,
      errorCode: "GET_TIMELINE_VEHICLES_FAILED",
    });
  }
};

export const claimVehicle = async (req, res) => {
  try {
    const { timelineId, missionVehicleId } = req.body;

    if (!timelineId || !missionVehicleId) {
      return response.sendError(res, {
        message: "Missing required fields: timelineId, missionVehicleId",
        statusCode: 400,
      });
    }

    const result = await timelineVehicleService.claimVehicle(timelineId, missionVehicleId);

    return response.sendSuccess(res, {
      data: result,
      message: "Vehicle claimed successfully",
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

export const returnVehicle = async (req, res) => {
  try {
    const { timelineId, missionVehicleId } = req.body;

    if (!timelineId || !missionVehicleId) {
      return response.sendError(res, {
        message: "Missing required fields: timelineId, missionVehicleId",
        statusCode: 400,
      });
    }

    const result = await timelineVehicleService.returnVehicle(timelineId, missionVehicleId);

    return response.sendSuccess(res, {
      data: result,
      message: "Vehicle returned successfully",
    });
  } catch (err) {
    console.error(err);
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};
