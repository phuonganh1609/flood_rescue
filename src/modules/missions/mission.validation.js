import Joi from "joi";

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "{{#label}} must be a valid ObjectId",
  });

const createMissionSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().max(1000).allow("", null),
  priority: Joi.string().valid("Critical", "High", "Normal").default("Normal"),
  type: Joi.string().valid("RESCUE", "RELIEF").required(),
});

const updateMissionSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200),
  description: Joi.string().max(1000).allow("", null),
  priority: Joi.string().valid("Critical", "High", "Normal"),
}).min(1); // Require at least one field to update

const assignTeamSchema = Joi.object({
  teamId: objectId.required().label("teamId"),
  requestId: objectId.required().label("requestId"),
  note: Joi.string().max(500).allow("", null),
});

const queryMissionSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(
    "PLANNED",
    "IN_PROGRESS",
    "PAUSED",
    "PARTIAL",
    "COMPLETED",
    "ABORTED",
  ),
  type: Joi.string().valid("RESCUE", "RELIEF"),
  code: Joi.string().trim(),
});

export {
  createMissionSchema,
  updateMissionSchema,
  assignTeamSchema,
  queryMissionSchema,
};
