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

const completeFromTeamRequestsSchema = Joi.object({
  note: Joi.string().max(1000).allow("", null),
});

const completeTimelineAutoSchema = Joi.object({
  note: Joi.string().max(1000).allow("", null),
});

const acceptTimelineSchema = Joi.object({
  warehouseId: objectId.label("warehouseId").required(),
  citizenCombos: Joi.array().items(
    Joi.object({
      missionRequestId: objectId.label("missionRequestId").required(),
      comboSupplyId: objectId.label("comboSupplyId").required(),
      quantity: Joi.number().integer().min(1).required(),
    })
  ).default([]),
  teamCombos: Joi.array().items(
    Joi.object({
      comboSupplyId: objectId.label("comboSupplyId").required(),
      quantity: Joi.number().integer().min(1).required(),
    })
  ).default([]),
  vehicles: Joi.array().items(
    Joi.object({
      vehicleId: objectId.label("vehicleId").required(),
    })
  ).default([]),
}).custom((value, helpers) => {
  const hasItems = value.citizenCombos.length > 0 || 
                   value.teamCombos.length > 0 || 
                   value.vehicles.length > 0;
  
  if (!hasItems) {
    return helpers.error("any.custom", {
      message: "Phải chọn ít nhất 1 citizen combo, team combo, hoặc vehicle"
    });
  }
  
  return value;
});

export {
  listTimelinesSchema,
  completeTimelineSchema,
  failTimelineSchema,
  withdrawTimelineSchema,
  cancelTimelineSchema,
  completeFromTeamRequestsSchema,
  completeTimelineAutoSchema,
  acceptTimelineSchema,
};

