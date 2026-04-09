import { timelineVehicleService } from "./timelineVehicle.service.js";
import response from "../../utils/response.js";

export const getTimelineVehicles = async (req, res) => {
  try {
    const { timelineId } = req.query;
    const result = await timelineVehicleService.getTimelineVehicles(timelineId);
    return response.sendSuccess(res, { data: result });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const claimVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await timelineVehicleService.claimVehicle(id);
    return response.sendSuccess(res, { data: result, message: "Nhận xe thành công" });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const returnVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await timelineVehicleService.returnVehicle(id);
    return response.sendSuccess(res, { data: result, message: "Trả xe thành công" });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const approveVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await timelineVehicleService.approveVehicle(id);
    return response.sendSuccess(res, { data: result, message: "Vehicle approved successfully" });
  } catch (err) {
    return response.sendError(res, { message: err.message, statusCode: err.statusCode || 400 });
  }
};

export const rejectVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const rejectionData = req.body;
    const result = await timelineVehicleService.rejectVehicle(id, rejectionData);
    return response.sendSuccess(res, { data: result, message: "Vehicle rejected successfully" });
  } catch (err) {
    return response.sendError(res, { message: err.message, statusCode: err.statusCode || 400 });
  }
};