import Joi from "joi";
import { FOLDERS } from "./cloudinary.constants.js";

export const signatureRequestSchema = Joi.object({
  folder: Joi.string()
    .valid(...Object.values(FOLDERS))
    .required()
    .messages({
      "any.required": "Folder is required",
      "any.only": "Invalid folder name",
    }),
  context: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  eager: Joi.boolean().optional().default(false),
});
