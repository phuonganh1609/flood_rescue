import response from '../../utils/response.js';
import { resourceService } from './resource.service.js';

export const create = async (req, res) => {
  try {
    const { name, type, description, quantity, unit, status, location, expiryDate } = req.body;

    if (!name || !type || !unit) {
      return response.sendError(res, {
        message: 'Missing required fields: name, type, unit',
        statusCode: 400,
      });
    }

    const result = await resourceService.create(
      { name, type, description, quantity, unit, status, location, expiryDate },
      req.user.id
    );

    return response.sendSuccess(res, {
      data: result.data,
      statusCode: 201,
      message: result.message,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return response.sendError(res, {
      message: err.message,
      statusCode: status,
    });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await resourceService.getById(id);

    if (!resource) {
      return response.sendError(res, {
        message: 'Resource not found',
        statusCode: 404,
      });
    }

    return response.sendSuccess(res, { data: resource });
  } catch (err) {
    return response.sendError(res, {
      message: err.message,
      statusCode: err.statusCode || 500,
    });
  }
};

export const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.name) filter.name = { $regex: req.query.name, $options: 'i' };

    const result = await resourceService.list(filter, { page, limit });

    const { data, ...pagination } = result;
    return response.sendSuccess(res, {
      data,
      meta: pagination,
    });
  } catch (err) {
    return response.sendError(res, {
      message: err.message,
      statusCode: err.statusCode || 500,
    });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await resourceService.update(id, req.body, req.user.id);

    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return response.sendError(res, {
      message: err.message,
      statusCode: status,
    });
  }
};

export const delete_ = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await resourceService.delete(id, req.user.id);

    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return response.sendError(res, {
      message: err.message,
      statusCode: status,
    });
  }
};

export const allocate = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamIds } = req.body;

    if (!teamIds || !Array.isArray(teamIds)) {
      return response.sendError(res, {
        message: 'teamIds must be provided as an array',
        statusCode: 400,
      });
    }

    const result = await resourceService.allocate(id, teamIds, req.user.id);

    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return response.sendError(res, {
      message: err.message,
      statusCode: status,
    });
  }
};

export const deallocate = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await resourceService.deallocate(id, req.user.id);

    return response.sendSuccess(res, {
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return response.sendError(res, {
      message: err.message,
      statusCode: status,
    });
  }
};
