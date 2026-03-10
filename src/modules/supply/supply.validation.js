import Joi from "joi";

// --- Create Supply ---
const addSupplySchema = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "Supply name is required",
    "any.required": "Supply name is required",
  }),

  category: Joi.string()
    .valid("FOOD", "WATER", "MEDICAL", "CLOTHING", "EQUIPMENT", "OTHER")
    .default("OTHER")
    .messages({
      "any.only": "Invalid supply category",
    }),

    unit: Joi.string().required().messages({
    "string.empty": "Unit is required",
    "any.required": "Unit is required",
  }),

  unitWeight: Joi.number().positive().required().messages({
    "number.base": "Unit weight must be a number",
    "number.positive": "Unit weight must be a positive number",
    "any.required": "Unit weight is required",
  }),

  description: Joi.string().min(10).max(500).required().messages({
    "string.empty": "Description is required",
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description cannot exceed 500 characters",
    "any.required": "Description is required",
  }),

  isActive: Joi.boolean().default(true),
 
});



// --- Update Supply ---
const updateSupplySchema = Joi.object({
  name: Joi.string().optional().messages({
    "string.empty": "Supply name cannot be empty",
  }),

  category: Joi.string()
    .valid("FOOD", "WATER", "MEDICAL", "CLOTHING", "EQUIPMENT", "OTHER")
    .optional()
    .messages({
      "any.only": "Invalid supply category",
    }),

  unit: Joi.string().optional().messages({
    "string.empty": "Unit cannot be empty",
  }),

  unitWeight: Joi.number().positive().optional().messages({
    "number.base": "Unit weight must be a number",
    "number.positive": "Unit weight must be a positive number",
  }),

  description: Joi.string().min(10).max(500).optional().messages({
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description cannot exceed 500 characters",
  }),

  isActive: Joi.boolean().optional(),
});

const cancelSupplySchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    "string.empty": "Cancellation reason is required",
    "string.min": "Cancellation reason must be at least 10 characters",
    "string.max": "Cancellation reason cannot exceed 500 characters",
    "any.required": "Cancellation reason is required",
  }),
});

// --- Mark Duplicate ---
const markDuplicateSchema = Joi.object({
  duplicatedOfSupplyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "duplicatedOfSupplyId must be a valid ObjectId",
      "any.required": "duplicatedOfSupplyId is required",
    }),
});

export {
  addSupplySchema, updateSupplySchema, cancelSupplySchema, markDuplicateSchema
};
