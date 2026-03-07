import Joi from 'joi';
import { WAREHOUSE_STATUS } from './warehouse.model.js';


const locationSchema = Joi.object({
  type: Joi.string().valid("Point").default("Point"),
  coordinates: Joi.array()
    .ordered(
 
      Joi.number().min(-180).max(180).required(), // longitude
           Joi.number().min(-90).max(90).required(), // latitude
    )
    .length(2)
    .required()
    .messages({
      "array.length": "Coordinates must be [longitude, latitude]",
    }),
}).required();
//-----------------------------------------------////------------------
const createSchema = Joi.object({
  name: Joi.string().required(),
  location: locationSchema.messages({
    "any.required": "Location is required",
  }),
  status: Joi.string().valid(...Object.values(WAREHOUSE_STATUS)).optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().optional(),
  location: Joi.object({
    type: Joi.string().valid('Point').optional(),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  }).optional(),
  status: Joi.string().valid(...Object.values(WAREHOUSE_STATUS)).optional(),
});


export { createSchema, updateSchema };
