import Joi from "joi";

/**
 * Validation schema for creating a request
 */
const addRequestSchema = Joi.object({
  type: Joi.string()
    .valid("Rescue", "Relief")
    .required()
    .messages({
      "string.empty": "Request type is required",
      "any.only": "Request type must be either Rescue or Relief",
      "any.required": "Request type is required",
    }),
  
  incidentType: Joi.string()
    .valid("Flood", "Trapped", "Injured", "Landslide", "Other")
    .default("Other")
    .messages({
      "any.only": "Invalid incident type",
    }),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      "number.base": "Latitude must be a number",
      "number.min": "Latitude must be between -90 and 90",
      "number.max": "Latitude must be between -90 and 90",
      "any.required": "Latitude is required",
    }),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      "number.base": "Longitude must be a number",
      "number.min": "Longitude must be between -180 and 180",
      "number.max": "Longitude must be between -180 and 180",
      "any.required": "Longitude is required",
    }),

  description: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      "string.empty": "Description is required",
      "string.min": "Description must be at least 10 characters",
      "string.max": "Description cannot exceed 500 characters",
      "any.required": "Description is required",
    }),

  peopleCount: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(1)
    .messages({
      "number.base": "People count must be a number",
      "number.min": "People count must be at least 1",
      "number.max": "People count cannot exceed 100",
    }),

  requestSupply: Joi.array()
    .items(Joi.string())
    .default([])
    .messages({
      "array.base": "Request supply must be an array",
    }),

  userID: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "userID must be a valid MongoDB ObjectId",
    }),

  media: Joi.alternatives()
    .try(
      Joi.string().min(1).messages({
        "string.empty": "media must be a valid file path",
      }),
      Joi.array().items(Joi.string().min(1)).messages({
        "array.base": "media must be a string or array of strings",
      })
    )
    .optional()
    .messages({
      "alternatives.match": "media must be a string or array of strings",
    }),
});

export { addRequestSchema };