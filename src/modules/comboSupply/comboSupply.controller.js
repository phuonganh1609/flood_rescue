import response from "../../utils/response.js";
import { comboSupplyService } from "./comboSupply.service.js";

const handleError = (err, res) => {
  return response.sendError(res, {
    message: err.message,
    statusCode: err.statusCode || 400,
  });
};

export const createComboSupply = async (req, res) => {
  try {
    const comboSupply = await comboSupplyService.createComboSupply(req.body, req.user);
    return response.sendSuccess(res, {
      data: comboSupply,
      statusCode: 201,
      message: "Combo Supply created successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getComboSupplies = async (req, res) => {
  try {
    // req.user chứa thông tin user đã login (có trường role)
    const result = await comboSupplyService.getComboSupplies(req.query, req.user);
    const { data, ...meta } = result;

    return response.sendSuccess(res, {
      data,
      meta,
      statusCode: 200,
      message: "Combo Supplies retrieved successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const getComboSupplyById = async (req, res) => {
  try {
    const comboSupply = await comboSupplyService.getComboSupplyById(req.params.id);
    return response.sendSuccess(res, {
      data: comboSupply,
      statusCode: 200,
      message: "Combo Supply retrieved successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const updateComboSupply = async (req, res) => {
  try {
    const comboSupply = await comboSupplyService.updateComboSupply(req.params.id, req.body);
    return response.sendSuccess(res, {
      data: comboSupply,
      statusCode: 200,
      message: "Combo Supply updated successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};

export const deleteComboSupply = async (req, res) => {
  try {
    const comboSupply = await comboSupplyService.deleteComboSupply(req.params.id);
    return response.sendSuccess(res, {
      data: comboSupply,
      statusCode: 200,
      message: "Combo Supply deleted successfully",
    });
  } catch (err) {
    return handleError(err, res);
  }
};
