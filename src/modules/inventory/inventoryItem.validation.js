import Joi from 'joi';
import { INVENTORY_ITEM_STATUS } from './inventoryItem.model.js';

const createSchema = Joi.object({
  supplyID: Joi.string().required(),
  description: Joi.string().optional(),
  quantity: Joi.number().integer().min(0).optional(),
  reservedQuantity: Joi.number().integer().min(0).optional(),
  unit: Joi.string().optional(),
  warehouse: Joi.string().required(),
  status: Joi.string().valid(...Object.values(INVENTORY_ITEM_STATUS)).optional(),
});
 
const updateSchema = Joi.object({
  supplyID: Joi.string().optional(),
  description: Joi.string().optional(),
  quantity: Joi.number().integer().min(0).optional(),
  reservedQuantity: Joi.number().integer().min(0).optional(),
  warehouse: Joi.string().optional(),
  status: Joi.string().valid(...Object.values(INVENTORY_ITEM_STATUS)).optional(),
});

export { createSchema, updateSchema };
