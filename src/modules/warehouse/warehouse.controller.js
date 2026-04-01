import { warehouseService } from "./warehouse.service.js";
import response from "../../utils/response.js";
import mongoose from "mongoose";
import {
  createSchema,
  updateSchema
} from "./warehouse.validation.js";
import e from "express";


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
      message: "Invalid warehouse ID",
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

// Warehouse controllers
export const add = async (req, res) => {
  try {
    const value = validateBody(createSchema, req.body, res);
    if (!value) return;

    const result = await warehouseService.create(value, req.user.id);
    return response.sendSuccess(res, {
      data: result.data,
      statusCode: 201,
      message: result.message,
    });
  } catch (err) {
    handleError(err, res);
  }
};

export const getByName = async (req, res) => {
 try {
    const { name } = req.query;

    if (!name) {
      return response.sendError(res, {
        message: "Name is required",
        statusCode: 400,
      });
    }

    const result = await warehouseService.getByName(name);

    if (!result) {
      return response.sendError(res, {
        message: "Warehouse not found",
        statusCode: 404,
      });
    }

    return response.sendSuccess(res, { data: result });
      } catch (err) {
        handleError(err, res);
  }
};

export const getAll = async (req, res) => {
 try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = {};
    if (req.query.name) filter.name = new RegExp(req.query.name, "i");
    if (req.query.status) filter.status = req.query.status;

    const result = await warehouseService.list(filter, { page, limit });

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
    const { name } = req.params;
    const payload = req.body;
    
        const value = validateBody(updateSchema, req.body, res);
        if (!value) return;
    
    const doc = await warehouseService.update(name, payload);
    if (!doc) return response.sendError(res, { message: 'Warehouse not found', statusCode: 404 });
    return response.sendSuccess(res, { data: doc, message: 'Warehouse updated' });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { name } = req.params;
    const doc = await warehouseService.remove(name);
    if (!doc) return response.sendError(res, { message: 'Warehouse not found', statusCode: 404 });
    return response.sendSuccess(res, { data: doc, message: 'Warehouse deleted' });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const updateWarehouseStatus = async (req, res) => {
  try {
    const result = await warehouseService.updateWarehouseStatus(
      req.params.id
    );

    return response.sendSuccess(res, {
      data: result,
      message: "Warehouse status updated"
    });

  } catch (err) {
    return response.sendError(res, {
      message: err.message,
      statusCode: 500
    });
  }
};
export const updateAllWarehouseStatus = async (req, res) => {
  try {
    const result = await warehouseService.updateAllWarehousesStatus();

    return response.sendSuccess(res, {
      data: result,
      message: "Warehouse status updated"
    });

  } catch (err) {
    return response.sendError(res, {
      message: err.message,
      statusCode: 500
    });
  }
};


// set maintenance
export const setWarehouseMaintenance = async (req, res) => {
  try {
    const result = await warehouseService.setMaintenance(req.params.id);

    return response.sendSuccess(res, {
      data: result,
      message: "Warehouse set to maintenance"
    });

  } catch (err) {
    return response.sendError(res, {
      message: err.message,
      statusCode: 500
    });
  }
};


// remove maintenance
export const removeWarehouseMaintenance = async (req, res) => {
  try {
    const result = await warehouseService.removeMaintenance(req.params.id);

    return response.sendSuccess(res, {
      data: result,
      message: "Warehouse back to normal"
    });

  } catch (err) {
    return response.sendError(res, {
      message: err.message,
      statusCode: 500
    });
  }
};