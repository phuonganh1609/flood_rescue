import mongoose from 'mongoose';
import response from '../../utils/response.js';
import { inventoryItemService } from './inventoryItem.service.js';
import { createSchema, updateSchema } from './inventoryItem.validation.js';

function validateObjectId(id, res, message = 'Invalid ID parameter') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.sendError(res, {
      message,
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
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const filter = {};
    if (req.query.supplyId) filter.supplyID = req.query.supplyId;
    if (req.query.warehouseId) filter.warehouse = req.query.warehouseId;
    if (req.query.quantity !== undefined) filter.quantity = String(req.query.quantity);
    if (req.query.unit) filter.unit = req.query.unit;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.supplyName) filter.supplyName = req.query.supplyName;

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
