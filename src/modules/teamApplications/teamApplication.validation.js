import Joi from "joi";
import { TEAM_APPLICATION_STATUS } from "./teamApplication.model.js";

const PHONE_PATTERN = /^\+?[0-9\s-]{8,20}$/;

export const createTeamApplicationSchema = Joi.object({
  motivation: Joi.string().trim().min(10).max(1000).required().messages({
    "string.empty": "Motivation is required",
    "string.min": "Motivation must be at least 10 characters",
    "string.max": "Motivation cannot exceed 1000 characters",
    "any.required": "Motivation is required",
  }),
  confirmPhoneNumber: Joi.string().trim().pattern(PHONE_PATTERN).optional().messages({
    "string.pattern.base": "confirmPhoneNumber must be a valid phone number",
  }),
});

export const listTeamApplicationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string()
    .valid(...Object.values(TEAM_APPLICATION_STATUS))
    .optional()
    .messages({
      "any.only": `Status must be one of: ${Object.values(TEAM_APPLICATION_STATUS).join(", ")}`,
    }),
});

export const teamApplicationIdParamSchema = Joi.object({
  applicationId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Application ID must be a valid ObjectId",
      "any.required": "Application ID is required",
    }),
});

export const rejectTeamApplicationSchema = Joi.object({
  reason: Joi.string().trim().max(500).optional().messages({
    "string.max": "Reason cannot exceed 500 characters",
  }),
});
