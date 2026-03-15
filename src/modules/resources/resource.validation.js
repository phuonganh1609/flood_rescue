import Joi from 'joi';
import { RESOURCE_TYPE, RESOURCE_STATUS } from './resource.model.js';

const createSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid(...Object.values(RESOURCE_TYPE)).required(),
  description: Joi.string().optional(),
  quantity: Joi.number().integer().min(0).optional(),
  unit: Joi.string().required(),
  status: Joi.string().valid(...Object.values(RESOURCE_STATUS)).optional(),
  location: Joi.string().optional(),
  expiryDate: Joi.date().optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().optional(),
  type: Joi.string().valid(...Object.values(RESOURCE_TYPE)).optional(),
  description: Joi.string().optional(),
  quantity: Joi.number().integer().min(0).optional(),
  unit: Joi.string().optional(),
  status: Joi.string().valid(...Object.values(RESOURCE_STATUS)).optional(),
  location: Joi.string().optional(),
  expiryDate: Joi.date().optional(),
  allocatedTo: Joi.array().items(Joi.string()).optional(),
}).min(1);

export { createSchema, updateSchema };
