import Joi from "joi";

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "{{#label}} must be a valid ObjectId",
  });

const listTeamRequestsQuerySchema = Joi.object({
  missionId: objectId.optional(),
  missionRequestId: objectId.optional(),
  teamId: objectId.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const teamRequestIdParamSchema = Joi.object({
  id: objectId.required().label("id"),
});

const completeTeamRequestSchema = Joi.object({
  note: Joi.string().max(1000).optional().allow(null, ""),
});

export { listTeamRequestsQuerySchema, teamRequestIdParamSchema, completeTeamRequestSchema };
