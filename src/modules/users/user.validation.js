import Joi from "joi";

/**
 * Valid roles from User model enum
 */
const VALID_ROLES = [
  "Citizen",
  "Rescue Team",
  "Rescue Coordinator",
  "Admin",
  "Manager",
];

/**
 * Query params validation for GET /api/users
 */
export const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  role: Joi.string()
    .valid(...VALID_ROLES)
    .messages({
      "any.only": `Role must be one of: ${VALID_ROLES.join(", ")}`,
    }),
  isActive: Joi.boolean(),
  noTeam: Joi.boolean(),
  search: Joi.string().trim().min(1).max(100).messages({
    "string.min": "Search keyword must be at least 1 character",
    "string.max": "Search keyword must not exceed 100 characters",
  }),
  sort: Joi.string().trim(),
});

/**
 * Body validation for PATCH /api/users/:id/role
 */
export const updateRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...VALID_ROLES)
    .required()
    .messages({
      "any.required": "Role is required",
      "string.empty": "Role is required",
      "any.only": `Role must be one of: ${VALID_ROLES.join(", ")}`,
    }),
});

/**
 * Params validation for routes with :id
 */
export const userIdParamSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "User ID must be a valid ObjectId",
      "any.required": "User ID is required",
    }),
});
