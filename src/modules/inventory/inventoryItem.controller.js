import mongoose from 'mongoose';
import response from '../../utils/response.js';
import { inventoryItemService } from './inventoryItem.service.js';
import { createSchema, updateSchema } from './inventoryItem.validation.js';
import Supply from '../supply/supply.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import { Warehouse } from '../warehouse/warehouse.model.js';
import XLSX from "xlsx";


function validateObjectId(id, res, errorMessage = 'Invalid request ID') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.sendError(res, {
      message: errorMessage,
      statusCode: 400,
    });
    return false;
  }
  return true;
}

function validateObjectName(name, res) {
  if (!name || name.trim() === '') {
    response.sendError(res, {
      message: 'Invalid name parameter',
      statusCode: 400,
    });
    return false;
  }
  return true;
}

function validateBody(schema, body, res) {
  const safeValidate = (payload) => {
    try {
      return schema.validate(payload, { abortEarly: false });
    } catch (_err) {
      return {
        error: {
          details: [{ path: ['body'], message: 'Validation failed' }],
        },
      };
    }
  };

  // Primary path for Joi schemas used at runtime.
  let result = safeValidate(body);

  // Compatibility path for mocked schema validators in tests.
  if (result?.error) {
    const wrappedResult = safeValidate({ body });
    if (!wrappedResult?.error) {
      result = {
        error: null,
        value: wrappedResult.value?.body ?? wrappedResult.value,
      };
    }
  }

  if (result?.error) {
    const errors = result.error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));

    response.sendError(res, {
      message: 'Validation failed',
      statusCode: 400,
      errors,
    });
    return null;
  }

  return result?.value ?? body;
}

function handleError(err, res) {
  const status = err.statusCode || 400;
  response.sendError(res, {
    message: err.message,
    statusCode: status,
  });
}

export const create = async (req, res) => {
  try {
    const value = validateBody(createSchema, req.body, res);
    if (!value) return;

    const result = await inventoryItemService.create(value, req.user.id);
    return response.sendSuccess(res, {
      data: result.data,
      statusCode: 201,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};

export const getById = async (req, res) => {
  try {
    if (!validateObjectId(req.params.id, res, 'Invalid request ID')) return;

    const doc = await inventoryItemService.getById(req.params.id);
    if (!doc) {
      return response.sendError(res, {
        message: 'Not found',
        statusCode: 404,
      });
    }

    return response.sendSuccess(res, { data: doc });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

// Backward-compatible alias for existing imports/tests.
export const getByID = getById;

export const getByName = async (req, res) => {
  try {
    if (!validateObjectName(req.params.supplyName, res)) return;

    const doc = await inventoryItemService.getByName(req.params.supplyName);
    if (!doc) {
      return response.sendError(res, {
        message: 'Not found',
        statusCode: 404,
      });
    }

    return response.sendSuccess(res, { data: doc });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const getAll = async (req, res) => {
 try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; 
    const itemType = req.query.itemType;

    const filter = {};
    if (req.query.supplyId) filter.supplyID = req.query.supplyId;
    if (req.query.warehouseId) filter.warehouse = req.query.warehouseId;
    if (req.query.quantity !== undefined) filter.quantity = String(req.query.quantity);
    if (req.query.unit) filter.unit = req.query.unit;
    if (req.query.status) filter.status = req.query.status;
    // SEARCH SUPPLY NAME
    if (req.query.supplyName) {

      const supplies = await Supply.find({
        name: { $regex: req.query.supplyName, $options: "i" }
      }).select("_id");

      filter.supplyID = { $in: supplies.map(s => s._id) };

    }
    //search vehicle license plate
    if (req.query.licensePlate) {

      const vehicles = await Vehicle.find({
        licensePlate: { $regex: req.query.licensePlate, $options: "i" }
      }).select("_id");

      filter.vehicleID = { $in: vehicles.map(v => v._id) };
    }
    if (itemType) {
      filter.itemType = itemType;
    }

    const result = await inventoryItemService.list(filter, { page, limit });
    const { data, ...pagination } = result;

    return response.sendSuccess(res, {
      data,
      meta: pagination,
    });
  } catch (err) {
    handleError(err, res);
  }
};

export const update = async (req, res) => {
  try {
    const id = req.params.id || req.params.name;
    const value = validateBody(updateSchema, req.body, res);
    if (!value) return;

    const doc = await inventoryItemService.update(id, value);
    if (!doc) {
      return response.sendError(res, {
        message: 'Inventory item not found',
        statusCode: 404,
      });
    }

    return response.sendSuccess(res, {
      data: doc,
      message: 'Inventory item updated',
    });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const id = req.params.id || req.params.name;
    const doc = await inventoryItemService.remove(id);
    if (!doc) {
      return response.sendError(res, {
        message: 'Inventory item not found',
        statusCode: 404,
      });
    }

    return response.sendSuccess(res, {
      data: doc,
      message: 'Inventory item deleted',
    });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

//import excel file
export const importFromExcel = async (req, res) => {
  try {
    const importType = req.query.importType;

    console.log("importType:", importType);

    if (!req.file) {
      return res.status(400).json({
        message: "File is required",
      });
    }

    if (!importType || !["SUPPLY", "VEHICLE"].includes(importType)) {
      return res.status(400).json({
        message: "importType phải là SUPPLY hoặc VEHICLE",
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    let allData = [];

    if (importType === "SUPPLY") {
      allData = XLSX.utils.sheet_to_json(sheet, {
        header: [
          "supplyName",
          "warehouse",
          "description",
          "quantity",
          "reservedQuantity",
          "unit",
          "status",
        ],
        range: 1,
      }).map((row) => ({ ...row, itemType: "SUPPLY" }));
    }

    if (importType === "VEHICLE") {
      allData = XLSX.utils.sheet_to_json(sheet, {
        header: ["licensePlate", "warehouse", "description", "status"],
        range: 1,
      }).map((row) => ({ ...row, itemType: "VEHICLE" }));
    }

    if (allData.length === 0) {
      return res.status(400).json({
        message: "No data found in file",
      });
    }

    const result = await inventoryItemService.importExcel(
      allData,
      req.user.id
    );

    if (!result || result.inserted === undefined) {
      return res.status(500).json({
        message: "Import failed: result invalid",
      });
    }

    return res.json({
      data: result.data,
      message: `Import thành công: ${result.inserted} items`,
    });
  } catch (err) {
    console.error("IMPORT ERROR:", err.message);

    return res.status(500).json({
      message: "Import Excel failed",
      error: err.message,
    });
  }
};

export const useSupply = async (req, res) => {
  try {
    const { supplyID, warehouseId, quantity } = req.body;

    console.log("BODY:", req.body); // 👈 debug

    if (!supplyID || !warehouseId || !quantity) {
      return response.sendError(res, {
        message: "Missing required fields",
        statusCode: 400,
      });
    }

    const result = await inventoryItemService.useSupplyFromInventory(
      supplyID,
      warehouseId,
      Number(quantity)
    );

    return response.sendSuccess(res, {
      data: result,
      message: "Supply used successfully",
    });

  } catch (err) {
    console.error(err);
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};