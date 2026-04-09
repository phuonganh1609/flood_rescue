import Joi from "joi";

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "{{#label}} phải là ObjectId hợp lệ",
  });

const createMissionSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().max(1000).allow("", null),
  priority: Joi.string().valid("Critical", "High", "Normal").default("Normal"),
  type: Joi.string().valid("RESCUE", "RELIEF").required(),
  comboSupplyId: objectId.optional().allow(null, "").label("comboSupplyId"),
});

const updateMissionSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200),
  description: Joi.string().max(1000).allow("", null),
  priority: Joi.string().valid("Critical", "High", "Normal"),
  comboSupplyId: objectId.optional().allow(null, "").label("comboSupplyId"),
}).min(1); // Require at least one field to update

const addRequestsSchema = Joi.object({
  requestIds: Joi.array().items(objectId.label("requestId")).min(1).required(),
  note: Joi.string().max(500).allow("", null),
});

const addTeamsSchema = Joi.object({
  teamIds: Joi.array().items(objectId.label("teamId")).min(1).required(),
  note: Joi.string().max(500).allow("", null),
});

const removeRequestParamsSchema = Joi.object({
  id: objectId.required().label("missionId"),
  requestId: objectId.required().label("requestId"),
});

const removeTeamParamsSchema = Joi.object({
  id: objectId.required().label("missionId"),
  teamId: objectId.required().label("teamId"),
});

const startMissionSchema = Joi.object({
  note: Joi.string().max(500).allow("", null),
});

const queryMissionSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(
    "DRAFT",
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

const getMissionRequestsQuerySchema = Joi.object({
  teamId: objectId.optional().label("teamId"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export {
  createMissionSchema,
  updateMissionSchema,
  addRequestsSchema,
  addTeamsSchema,
  removeRequestParamsSchema,
  removeTeamParamsSchema,
  startMissionSchema,
  queryMissionSchema,
  getMissionRequestsQuerySchema,
};
