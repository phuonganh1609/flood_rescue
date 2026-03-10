import Joi from "joi";
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
// --- Create Vehicle ---
const addVehicleSchema = Joi.object({
  licensePlate: Joi.string().required().trim().uppercase().messages({
    "string.empty": "License plate is required",
    "any.required": "License plate is required",
  }),

  type: Joi.string()
    .valid(
      "AMBULANCE",
      "RESCUE_BOAT",
      "FIRE_TRUCK",
      "TRUCK",
      "VAN",
      "MOTORCYCLE",
      "OTHERS"
    )
    .required()
    .messages({
      "any.only": "Invalid vehicle type",
      "any.required": "Vehicle type is required",
    }),

  brand: Joi.string().required().trim().messages({
    "string.empty": "Brand is required",
    "any.required": "Brand is required",
  }),

  model: Joi.string().required().trim().messages({
    "string.empty": "Model is required",
    "any.required": "Model is required",
  }),

  year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required().messages({
    "number.base": "Year must be a number",
    "number.min": "Year must be at least 1900",
    "number.max": `Year cannot exceed ${new Date().getFullYear() + 1}`,
    "any.required": "Year is required",
  }),

  color: Joi.string().optional().trim().messages({
    "string.empty": "Color cannot be empty",
  }),

  fuelType: Joi.string()
    .valid("PETROL", "DIESEL", "HYBRID", "ELECTRIC")
    .default("DIESEL")
    .messages({
      "any.only": "Invalid fuel type",
    }),

  capacity: Joi.number().positive().required().messages({
    "number.base": "Capacity must be a number",
    "number.positive": "Capacity must be a positive number",
    "any.required": "Capacity is required",
  }),

  capacityUnit: Joi.string()
    .valid("PERSONS", "LITERS", "TONS", "KG")
    .required()
    .messages({
      "any.only": "Invalid capacity unit",
      "any.required": "Capacity unit is required",
    }),

  status: Joi.string()
    .valid("ACTIVE", "INACTIVE", "MAINTENANCE", "OUT_OF_SERVICE")
    .default("ACTIVE")
    .messages({
      "any.only": "Invalid vehicle status",
    }),

  assignedTo: Joi.string().optional().pattern(/^[0-9a-fA-F]{24}$/).messages({
    "string.pattern.base": "assignedTo must be a valid ObjectId",
  }),

  location: locationSchema.messages({
    "any.required": "Location is required",
  }),
  currentMission: Joi.string().optional().pattern(/^[0-9a-fA-F]{24}$/).messages({
    "string.pattern.base": "currentMission must be a valid ObjectId",
  }),

  lastMaintenanceDate: Joi.date().optional().messages({
    "date.base": "Last maintenance date must be a valid date",
  }),

  maintenanceInterval: Joi.number().positive().optional().default(90).messages({
    "number.base": "Maintenance interval must be a number",
    "number.positive": "Maintenance interval must be a positive number",
  }),

  description: Joi.string().max(500).optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),

  isActive: Joi.boolean().default(true),
});

// --- Update Vehicle ---
const updateVehicleSchema = Joi.object({
  licensePlate: Joi.string().optional().trim().uppercase().messages({
    "string.empty": "License plate cannot be empty",
  }),

  type: Joi.string()
    .valid(
      "AMBULANCE",
      "RESCUE_BOAT",
      "FIRE_TRUCK",
      "TRUCK",
      "VAN",
      "MOTORCYCLE",
      "OTHERS"
    )
    .optional()
    .messages({
      "any.only": "Invalid vehicle type",
    }),

  brand: Joi.string().optional().trim().messages({
    "string.empty": "Brand cannot be empty",
  }),

  model: Joi.string().optional().trim().messages({
    "string.empty": "Model cannot be empty",
  }),

  year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional().messages({
    "number.base": "Year must be a number",
    "number.min": "Year must be at least 1900",
    "number.max": `Year cannot exceed ${new Date().getFullYear() + 1}`,
  }),

  color: Joi.string().optional().trim().messages({
    "string.empty": "Color cannot be empty",
  }),

  fuelType: Joi.string()
    .valid("PETROL", "DIESEL", "HYBRID", "ELECTRIC")
    .optional()
    .messages({
      "any.only": "Invalid fuel type",
    }),

  capacity: Joi.number().positive().optional().messages({
    "number.base": "Capacity must be a number",
    "number.positive": "Capacity must be a positive number",
  }),

  capacityUnit: Joi.string()
    .valid("PERSONS", "LITERS", "TONS", "KG")
    .optional()
    .messages({
      "any.only": "Invalid capacity unit",
    }),

  status: Joi.string()
    .valid("ACTIVE", "INACTIVE", "MAINTENANCE", "OUT_OF_SERVICE")
    .optional()
    .messages({
      "any.only": "Invalid vehicle status",
    }),

  assignedTo: Joi.string().optional().pattern(/^[0-9a-fA-F]{24}$/).allow(null).messages({
    "string.pattern.base": "assignedTo must be a valid ObjectId",
  }),

  location: Joi.string().optional().trim().messages({
    "string.empty": "Location cannot be empty",
  }),

  lastMaintenanceDate: Joi.date().optional().messages({
    "date.base": "Last maintenance date must be a valid date",
  }),

  maintenanceInterval: Joi.number().positive().optional().messages({
    "number.base": "Maintenance interval must be a number",
    "number.positive": "Maintenance interval must be a positive number",
  }),

  description: Joi.string().max(500).optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),

  isActive: Joi.boolean().optional(),
});

// --- Assign Vehicle to Team ---
const assignVehicleSchema = Joi.object({
  teamId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "teamId must be a valid ObjectId",
      "any.required": "teamId is required",
    }),
});

export { addVehicleSchema, updateVehicleSchema, assignVehicleSchema };
