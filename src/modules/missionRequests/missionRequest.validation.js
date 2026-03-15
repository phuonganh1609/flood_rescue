import Joi from "joi";

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "{{#label}} phải là ObjectId hợp lệ",
  });

const missionRequestIdParamSchema = Joi.object({
  id: objectId.required().label("id"),
});

const missionRequestActionSchema = Joi.object({
  note: Joi.string().max(500).allow("", null),
});

export { missionRequestIdParamSchema, missionRequestActionSchema };
