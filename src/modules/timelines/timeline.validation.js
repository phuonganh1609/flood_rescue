import Joi from "joi";
import { TIMELINE_STATUS } from "./timeline.model.js";

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "{{#label}} must be a valid ObjectId",
  });

const listTimelinesSchema = Joi.object({
  missionId: objectId.label("missionId"),
  requestId: objectId.label("requestId"),
  teamId: objectId.label("teamId"),
  status: Joi.string().valid(...Object.values(TIMELINE_STATUS)),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const completeTimelineSchema = Joi.object({
  outcome: Joi.string()
    .valid(TIMELINE_STATUS.COMPLETED, TIMELINE_STATUS.PARTIAL)
    .required(),
  note: Joi.string().max(1000).allow("", null),
  rescuedCount: Joi.number().integer().min(0).optional(),
});

const failTimelineSchema = Joi.object({
  failureReason: Joi.string().trim().min(3).max(500).required(),
  note: Joi.string().max(1000).allow("", null),
});

const withdrawTimelineSchema = Joi.object({
  withdrawalReason: Joi.string().trim().min(3).max(500).required(),
  note: Joi.string().max(1000).allow("", null),
});

const cancelTimelineSchema = Joi.object({
  note: Joi.string().max(1000).allow("", null),
});

export {
  listTimelinesSchema,
  completeTimelineSchema,
  failTimelineSchema,
  withdrawTimelineSchema,
  cancelTimelineSchema,
};

