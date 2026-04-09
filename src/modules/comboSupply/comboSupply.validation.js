import Joi from "joi";

export const createComboSupplyValidation = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid("Citizen", "Rescue Team").required(),
  description: Joi.string().required(),
  supplies: Joi.array().items(
    Joi.object({
      supplyId: Joi.string().hex().length(24).required(),
      quantity: Joi.number().min(1).required(),
    })
  ).required(),
  isActive: Joi.boolean().optional(),
});

export const updateComboSupplyValidation = Joi.object({
  name: Joi.string().optional(),
  type: Joi.string().valid("Citizen", "Rescue Team").optional(),
  description: Joi.string().optional(),
  supplies: Joi.array().items(
    Joi.object({
      supplyId: Joi.string().hex().length(24).required(),
      quantity: Joi.number().min(1).required(),
    })
  ).optional(),
  isActive: Joi.boolean().optional(),
});