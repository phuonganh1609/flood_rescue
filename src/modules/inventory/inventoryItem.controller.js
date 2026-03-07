import response from '../../utils/response.js';
import {inventoryItemService} from './inventoryItem.service.js';
import { createSchema, updateSchema } from './inventoryItem.validation.js';

function validateObjectId(id, res) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.sendError(res, {
      message: "Invalid request ID",
      statusCode: 400,
    });
    return false;
  }
  return true;
}

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

function handleError(err, res) {
  const status = err.statusCode || 400;
  response.sendError(res, {
    message: err.message,
    statusCode: status,
  });
}
//-----------------------------------------------------//─
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

export const getByID = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id, res)) return;
    const doc = await inventoryItemService.getById(id);
    if (!doc) return response.sendError(res, { message: 'Not found', statusCode: 404 });
    return response.sendSuccess(res, { data: doc });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const getAll = async (req, res) => {
 try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; 

    const filter = {};
    if (req.query.supplyId) filter.supplyID = req.query.supplyId;
    if (req.query.warehouseId) filter.warehouse = req.query.warehouseId;
    if (req.query.quantity) filter.quantity = req.query.quantity;
    if (req.query.unit) filter.unit = req.query.unit;
    if (req.query.status) filter.status = req.query.status;

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
    const { name } = req.params;
    const payload = req.body;
    
        const value = validateBody(updateSchema, req.body, res);
        if (!value) return;
    
    const doc = await inventoryItemService.update(name, payload);
    if (!doc) return response.sendError(res, { message: 'Inventory item not found', statusCode: 404 });
    return response.sendSuccess(res, { data: doc, message: 'Inventory item updated' });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { name } = req.params;
    const doc = await inventoryItemService.remove(name);
    if (!doc) return response.sendError(res, { message: 'Inventory item not found', statusCode: 404 });
    return response.sendSuccess(res, { data: doc, message: 'Inventory item deleted' });
  } catch (err) {
    return response.sendError(res, { message: err.message });
  }
};
