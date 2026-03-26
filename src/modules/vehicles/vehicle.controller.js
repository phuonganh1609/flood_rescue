import { vehicleService } from "./vehicle.service.js";
import response from "../../utils/response.js";
import mongoose from "mongoose";
import {
  addVehicleSchema,
  updateVehicleSchema,
  assignVehicleSchema,
} from "./vehicle.validation.js";
import XLSX from "xlsx";

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
      message: "Invalid vehicle ID",
      statusCode: 400,
    });
    return false;
  }
  return true;
}

function handleError(err, res) {
  const status = err.statusCode || 500;
  response.sendError(res, {
    message: err.message,
    statusCode: status,
  });
}

// ─── Create ───────────────────────────────────────────────

/**
 * POST /vehicles
 * Create a new vehicle
 */
export const addVehicle = async (req, res) => {
  try {
    const value = validateBody(addVehicleSchema, req.body, res);
    if (!value) return;

    const result = await vehicleService.createVehicle(value, req.user.id);
    return response.sendSuccess(res, {
      data: result.data,
      statusCode: 201,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Read ───────────────────────────────────────────────

/**
 * GET /vehicles/:vehicleId
 * Get vehicle by ID
 */
export const getVehicle = async (req, res) => {
  try {
    const vehicle = await vehicleService.getVehicle(req.params.licensePlate);
    if (!vehicle) {
      return response.sendError(res, {
        message: "Vehicle not found",
        statusCode: 404,
      });
    }

    return response.sendSuccess(res, { data: vehicle });
  } catch (err) {
    handleError(err, res);
  }
};

/**
 * GET /vehicles
 * Get all vehicles with filtering and pagination
 */
export const getAllVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = { isActive: true };
    if (req.query.type) filter.type = new RegExp(req.query.type, "i");
    if (req.query.status) filter.status = req.query.status;
    if (req.query.licensePlate)
      filter.licensePlate = new RegExp(req.query.licensePlate, "i");
    if (req.query.brand) filter.brand = new RegExp(req.query.brand, "i");

    const result = await vehicleService.getAllVehicles(filter, { page, limit });

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
 * GET /vehicles/type/:type
 * Get vehicles by type
 */
export const getVehiclesByType = async (req, res) => {
  try {
    const type = req.params.type;
    if (!type) {
      return response.sendError(res, {
        message: "Type is required",
        statusCode: 400,
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await vehicleService.getVehiclesByType(type, {
      page,
      limit,
    });

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
 * GET /vehicles/status/:status
 * Get vehicles by status
 */
export const getVehiclesByStatus = async (req, res) => {
  try {
    const status = req.params.status;
    if (!status) {
      return response.sendError(res, {
        message: "Status is required",
        statusCode: 400,
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await vehicleService.getVehiclesByStatus(status, {
      page,
      limit,
    });

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
 * GET /vehicles/team/:teamId
 * Get vehicles assigned to a team
 */
export const getVehiclesByTeam = async (req, res) => {
  try {
    if (!validateObjectId(req.params.teamId, res)) return;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await vehicleService.getVehiclesByTeam(req.params.teamId, {
      page,
      limit,
    });

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
 * GET /vehicles/stats
 * Get vehicle statistics
 */
export const getVehicleStats = async (req, res) => {
  try {
    const stats = await vehicleService.getVehicleStats();
    return response.sendSuccess(res, { data: stats });
  } catch (err) {
    handleError(err, res);
  }
};

/**
 * GET /vehicles/maintenance/needed
 * Get vehicles needing maintenance
 */
export const getVehiclesNeedingMaintenance = async (req, res) => {
  try {
    const vehicles = await vehicleService.getVehiclesNeedingMaintenance();
    return response.sendSuccess(res, { data: vehicles });
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Update ───────────────────────────────────────────────

/**
 * PUT /vehicles/:vehicleId
 * Update a vehicle
 */
export const updateVehicle = async (req, res) => {
  try {
    if (!validateObjectId(req.params.vehicleId, res)) return;

    const value = validateBody(updateVehicleSchema, req.body, res);
    if (!value) return;

    const result = await vehicleService.updateVehicle(
      req.params.vehicleId,
      value,
      req.user.id
    );

    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};

/**
 * PATCH /vehicles/:vehicleId/assign
 * Assign vehicle to team
 */
export const assignVehicleToTeam = async (req, res) => {
  try {
    if (!validateObjectId(req.params.vehicleId, res)) return;

    const value = validateBody(assignVehicleSchema, req.body, res);
    if (!value) return;

    const result = await vehicleService.assignVehicleToTeam(
      req.params.vehicleId,
      value.teamId,
      req.user.id
    );

    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};

/**
 * PATCH /vehicles/:vehicleId/maintenance
 * Update vehicle maintenance status
 */
export const updateMaintenanceStatus = async (req, res) => {
  try {
    if (!validateObjectId(req.params.vehicleId, res)) return;

    const result = await vehicleService.updateMaintenanceStatus(
      req.params.vehicleId,
      req.user.id
    );

    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};

// ─── Delete ───────────────────────────────────────────────

/**
 * DELETE /vehicles/:vehicleId
 * Delete a vehicle
 */
export const deleteVehicle = async (req, res) => {
  try {
    if (!validateObjectId(req.params.vehicleId, res)) return;

    const result = await vehicleService.deleteVehicle(
      req.params.vehicleId,
      req.user.id
    );

    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};

//import excel file
export const importVehiclesFromExcel = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        message: "File is required"
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const data = XLSX.utils.sheet_to_json(sheet, {
      header: ["licensePlate", "type",  "brand", "model", "year", "color", "capacity", "capacityUnit", "status","lastMaintenanceDate", "MaintenanceDate"],
      range: 1
    });

    const result = await vehicleService.importExcel(data, req.user.id);

    return response.sendSuccess(res, {
      data: result,
      message: "Import vehicles successfully"
    });

  } catch (err) {

    return response.sendError(res, {
      message: "Import Excel failed",
      statusCode: 500,
      errors: err.message
    });

  }
};

export const useVehicle = async (req, res) => {
  try {
    const result = await vehicleService.useVehicleByPlate(
      req.params.licensePlate,
      req.user.id
    );

    return response.sendSuccess(res, result);
  } catch (err) {
    handleError(err, res);
  }
};

export const releaseVehicle = async (req, res) => {
  try {
    const result = await vehicleService.releaseVehicleByPlate(
      req.params.licensePlate,
      req.user.id
    );

    return response.sendSuccess(res, result);
  } catch (err) {
    handleError(err, res);
  }
};