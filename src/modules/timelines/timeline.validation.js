import Joi from "joi";
import { TIMELINE_STATUS } from "./timeline.model.js";

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "{{#label}} phải là ObjectId hợp lệ",
  });

const listTimelinesSchema = Joi.object({
  missionId: objectId.label("missionId"),
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
  completions: Joi.array()
    .items(
      Joi.object({
        missionRequestId: objectId.required().label("missionRequestId"),
        rescuedCount: Joi.number().integer().min(0).required(),
      }),
    )
    .min(1)
    .required()
    .custom((value, helpers) => {
      const ids = value.map((item) => item.missionRequestId);
      const unique = new Set(ids);
      if (unique.size !== ids.length) {
        return helpers.error("array.duplicates");
      }
      return value;
    })
    .messages({
      "array.duplicates": "completions chứa missionRequestId bị trùng",
    }),
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

