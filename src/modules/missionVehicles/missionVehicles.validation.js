import Joi from "joi";

export const assignVehicleSchema = Joi.object({
  missionId: Joi.string().required(),
  userId: Joi.string().required(),
  location: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required()
  }).required()
});