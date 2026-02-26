import { supplyService } from "./supply.service.js";
import response from "../../utils/response.js";
import mongoose from "mongoose";
import {
  addSupplySchema,
  updateSupplySchema
} from "./supply.validation.js";

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
    if (!validateObjectId(req.params.supplyId, res)) return;

    const supply = await supplyService.getSupplyById(req.params.supplyId);
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

export const getSupplyByRequestType = async (req, res) => {
  try {
    const type = req.params.type;
    if (!type) {
      return response.sendError(res, {
        message: "type is required",
        statusCode: 400,
      });
    }
    // Validate allowed request types
    const allowed = ["Rescue", "Relief"];
    if (!allowed.includes(type)) {
      return response.sendError(res, {
        message: `Invalid type. Allowed: ${allowed.join(", ")}`,
        statusCode: 400,
      });
    }

    const data = await supplyService.getSupplyByRequestType(type);
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
