import Joi from "joi";

// --- Reusable schemas ---
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

const requestSupplyItemSchema = Joi.object({
  name: Joi.string()
    .required()
    .messages({
      "string.pattern.base": "supplyName must be a valid supply name",
    }),
  requestedQty: Joi.number().integer().min(1).required().messages({
    "number.min": "Requested quantity must be at least 1",
  }),
});

// --- Create Request ---
const addRequestSchema = Joi.object({
  type: Joi.string().valid("Rescue", "Relief").required().messages({
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

  location: locationSchema.messages({
    "any.required": "Location is required",
  }),

  description: Joi.string().min(10).max(500).required().messages({
    "string.empty": "Description is required",
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description cannot exceed 500 characters",
    "any.required": "Description is required",
  }),

  peopleCount: Joi.number().integer().min(0).max(100).default(1).messages({
    "number.base": "People count must be a number",
    "number.min": "People count must be at least 0",
    "number.max": "People count cannot exceed 100",
  }),

  requestSupplies: Joi.array()
    .items(requestSupplyItemSchema)
    .default([])
    .messages({
      "array.base": "requestSupplies must be an array",
    }),

  imageUrls: Joi.array()
    .items(
      Joi.string().uri().required().messages({
        "string.uri": "Each image URL must be a valid HTTP/HTTPS URL",
        "string.empty": "Image URL cannot be empty",
      }),
    )
    .max(5)
    .optional()
    .messages({
      "array.base": "imageUrls must be an array",
      "array.max": "Maximum 5 images allowed",
    }),
});

// --- Verify / Reject Request ---
const verifyRequestSchema = Joi.object({
  approved: Joi.boolean().required().messages({
    "any.required": "approved (true/false) is required",
  }),
  priority: Joi.string()
    .valid("Critical", "High", "Normal")
    .when("approved", {
      is: true,
      then: Joi.optional().default("Normal"),
      otherwise: Joi.forbidden(),
    })
    .messages({
      "any.only": "Priority must be Critical, High, or Normal",
    }),
  reason: Joi.string()
    .max(500)
    .when("approved", {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "any.required": "Reason is required when rejecting a request",
      "string.max": "Reason cannot exceed 500 characters",
    }),
});

// --- Cancel Request ---
const cancelRequestSchema = Joi.object({
  reason: Joi.string().max(500).optional().messages({
    "string.max": "Reason cannot exceed 500 characters",
  }),
});

// --- Mark Duplicate ---
const markDuplicateSchema = Joi.object({
  duplicatedOfRequestId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "duplicatedOfRequestId must be a valid ObjectId",
      "any.required": "duplicatedOfRequestId is required",
    }),
});

// --- Update Location ---
const updateLocationSchema = Joi.object({
  location: locationSchema.messages({
    "any.required": "Location is required",
  }),
  isLocationVerified: Joi.boolean().default(true),
});

// --- Update Priority ---
const updatePrioritySchema = Joi.object({
  priority: Joi.string()
    .valid("Critical", "High", "Normal")
    .required()
    .messages({
      "any.only": "Priority must be Critical, High, or Normal",
      "any.required": "Priority is required",
    }),
});

// --- Create Request On Behalf (Coordinator) ---
const createRequestOnBehalfSchema = Joi.object({
  citizenId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "citizenId must be a valid ObjectId",
    }),

  userName: Joi.string()
    .min(2)
    .max(100)
    .when("citizenId", {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.required(),
    })
    .messages({
      "any.required": "userName is required when citizenId is not provided",
      "string.min": "userName must be at least 2 characters",
      "string.max": "userName cannot exceed 100 characters",
    }),

  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10,11}$/)
    .when("citizenId", {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.required(),
    })
    .messages({
      "any.required": "phoneNumber is required when citizenId is not provided",
      "string.pattern.base": "phoneNumber must be 10-11 digits",
    }),

  type: Joi.string().valid("Rescue", "Relief").required().messages({
    "any.only": "Request type must be either Rescue or Relief",
    "any.required": "Request type is required",
  }),

  incidentType: Joi.string()
    .valid("Flood", "Trapped", "Injured", "Landslide", "Other")
    .default("Other"),

  location: locationSchema.messages({
    "any.required": "Location is required",
  }),

  description: Joi.string().min(10).max(500).required().messages({
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description cannot exceed 500 characters",
    "any.required": "Description is required",
  }),

  peopleCount: Joi.number().integer().min(0).max(100).default(1),

  priority: Joi.string()
    .valid("Critical", "High", "Normal")
    .default("Normal")
    .messages({
      "any.only": "Priority must be Critical, High, or Normal",
    }),

  requestSupplies: Joi.array().items(requestSupplyItemSchema).default([]),

  imageUrls: Joi.array().items(Joi.string().uri()).max(5).optional(),
});

export {
  addRequestSchema,
  verifyRequestSchema,
  cancelRequestSchema,
  markDuplicateSchema,
  updateLocationSchema,
  updatePrioritySchema,
  createRequestOnBehalfSchema,
};
