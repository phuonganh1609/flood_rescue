import { supplyService } from "./supply.service.js";
import response from "../../utils/response.js";
import mongoose from "mongoose";
import {
  addSupplySchema,
  updateSupplySchema
} from "./supply.validation.js";
import XLSX from "xlsx";
import { supplyRepository } from "./supply.repository.js";

function validateBody(schema, body, res) {
  const { error, value } = schema.validate(body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join("."),
      message: d.message,
    }));
    response.sendError(res, {
      message: "Validation failed",
      statusCode: 400,
      errors,
    });
    return null;
  }
  return value;
}

function validateObjectId(id, res) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.sendError(res, {
      message: "Invalid supply ID",
      statusCode: 400,
    });
    return false;
  }
  return true;
}

function handleError(err, res) {
  const status = err.statusCode || 400;
  response.sendError(res, {
    message: err.message,
    statusCode: status,
  });
}

export const addSupply = async (req, res) => {
  try {
    const value = validateBody(addSupplySchema, req.body, res);
    if (!value) return;

    const result = await supplyService.createSupply(value, req.user.id);
    return response.sendSuccess(res, {
      data: result.data,
      statusCode: 201,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};
// ─── Read ─────────────────────────────────────────────────

/**
 * GET /supplies/:supplyId
 */
export const getSupply = async (req, res) => {
  try {
    if (!validateObjectName(req.params.supplyName, res)) return;

    const supply = await supplyService.getSupplyByName(req.params.supplyName);
    if (!supply) {
      return response.sendError(res, {
        message: "Supply not found",
        statusCode: 404,
      });
    }

    return response.sendSuccess(res, { data: supply });
  } catch (err) {
    handleError(err, res);
  }
};

/**
 * GET /supplies
 * Get all supplies
 */
export const getAllSupplies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.name) filter.name = new RegExp(req.query.name, "i");

    const result = await supplyService.getAllSupplies(filter, { page, limit });

    const { data, ...pagination } = result;

    return response.sendSuccess(res, {
      data,
      meta: pagination,
    });
  } catch (err) {
    handleError(err, res);
  }
};
/**
 * get supplie by request type
 * GET /supplies/type/:type
 */

export const getSupplyByRequestStatus = async (req, res) => {
  try {
    const status = req.params.status;
    if (!status) {
      return response.sendError(res, {
        message: "status is required",
        statusCode: 400,
      });
    }
    // Validate allowed request types 
    const allowed = [ "IN_PROGRESS",];
    if (!allowed.includes(status)) {
      return response.sendError(res, {
        message: `Invalid status. Allowed: ${allowed.join(", ")}`,
        statusCode: 400,
      });
    }

    const data = await supplyService.getSupplyByRequestStatus(status);
    return response.sendSuccess(res, { data });
  } catch (err) {
    handleError(err, res);
  }
};


// ─── Update ─────────────────────────────────────────────────

/**
 * PUT /supplies/:supplyId
 * Update a supply
 */
export const updateSupply = async (req, res) => {
  try {
    if (!validateObjectId(req.params.supplyId, res)) return;

    const value = validateBody(updateSupplySchema, req.body, res);
    if (!value) return;

    const result = await supplyService.updateSupply(req.params.supplyId, value, req.user.id);
    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};

/**
 * DELETE /supplies/:supplyId
 * Delete a supply
 */
export const deleteSupply = async (req, res) => {
  try {
    if (!validateObjectId(req.params.supplyId, res)) return;

    const result = await supplyService.deleteSupply(req.params.supplyId, req.user.id);
    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};

//import excel file
export const importSuppliesFromExcel = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        message: "File is required"
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const data = XLSX.utils.sheet_to_json(sheet, {
      header: ["name", "category", "unit", "unitWeight"],
      range: 1
    });

    const result = await supplyService.importExcel(data, req.user.id);

    return response.sendSuccess(res, {
      data: result,
      message: "Import supplies successfully"
    });

  } catch (err) {

    return response.sendError(res, {
      message: "Import Excel failed",
      statusCode: 500,
      errors: err.message
    });

  }
};