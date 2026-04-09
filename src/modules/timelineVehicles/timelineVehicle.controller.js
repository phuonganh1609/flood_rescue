import { timelineVehicleService } from "./timelineVehicle.service.js";
import response from "../../utils/response.js";

export const claimVehicle = async (req, res) => {
  try {
    const { timelineId, vehicleId } = req.body;
    const result = await timelineVehicleService.claimVehicle(timelineId, vehicleId);
    return response.sendSuccess(res, { data: result, message: "Nhận xe thành công" });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const returnVehicle = async (req, res) => {
  try {
    const { timelineId, vehicleId } = req.body;
    const result = await timelineVehicleService.returnVehicle(timelineId, vehicleId);
    return response.sendSuccess(res, { data: result, message: "Trả xe thành công" });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};