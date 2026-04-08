import Joi from "joi";
import { validate } from "../../middlewares/validate.middleware.js";

const missionSupplyQuerySchema = Joi.object({
  status: Joi.string().optional(),
  missionId: Joi.string().hex().length(24).optional(),
  teamId: Joi.string().hex().length(24).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
});

export const validateMissionSupplyQuery = validate(missionSupplyQuerySchema, "query");