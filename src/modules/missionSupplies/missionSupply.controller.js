// controllers/missionSupply.controller.js
import MissionSupplyService from "./missionSupply.service.js";
import response from "../../utils/response.js";


export const getAll = async (req, res) => {
    try {
      const status = req.query.status ? req.query.status.split(",") : [];
      const result = await MissionSupplyService.getMissionSupplies({
        ...req.query,
        status
      });
      
      return response.sendSuccess(res, {
        data: result.data,
        meta: result.meta,
        message: "Mission supplies fetched successfully",
      });
    } catch (error) {
      return response.sendError(res, { message: error.message, statusCode: 500 });
    }
  };

export const updateAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await MissionSupplyService.allocateSupply(id, req.body, req.user._id);
    return response.sendSuccess(res, { data, message: "Supply allocated successfully" });
  } catch (error) {
    return response.sendError(res, { message: error.message, statusCode: 500 });
  }
};

