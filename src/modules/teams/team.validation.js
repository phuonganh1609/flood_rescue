import Joi from "joi";

/**
 * Validation schema for creating a team
 */
export const createTeamSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Team name is required",
    "string.min": "Team name must be at least 2 characters",
    "string.max": "Team name must not exceed 100 characters",
  }),
  leaderId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      "string.pattern.base": "Leader ID must be a valid ObjectId",
    }),
});

/**
 * Validation schema for updating a team
 */
export const updateTeamSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).messages({
    "string.min": "Team name must be at least 2 characters",
    "string.max": "Team name must not exceed 100 characters",
  }),
  leaderId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      "string.pattern.base": "Leader ID must be a valid ObjectId",
    }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

/**
 * Validation schema for adding a member
 */
export const addMemberSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "User ID is required",
      "string.pattern.base": "User ID must be a valid ObjectId",
    }),
});

/**
 * Validation schema for changing team leader
 */
export const changeLeaderSchema = Joi.object({
  newLeaderId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "New Leader ID is required",
      "string.pattern.base": "New Leader ID must be a valid ObjectId",
    }),
});
