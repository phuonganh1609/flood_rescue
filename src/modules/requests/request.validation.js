import Joi from "joi";

/**
 * Validation schema cho thêm request
 */
const addRequestSchema = Joi.object({
  type: Joi.string()
    .valid("Cứu trợ", "Cứu nạn")
    .required()
    .messages({
      "string.empty": "Loại yêu cầu không được để trống",
      "any.only": "Loại yêu cầu phải là Cứu trợ hoặc Cứu nạn",
      "any.required": "Loại yêu cầu là bắt buộc",
    }),
  
  incidentType: Joi.string()
    .valid("Ngập lụt", "Bị Kẹt", "Bị Thương", "Sạt lở", "Khác")
    .default("Khác")
    .messages({
      "any.only": "Loại sự cố không hợp lệ",
    }),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      "number.base": "Vĩ độ phải là số",
      "number.min": "Vĩ độ phải từ -90 đến 90",
      "number.max": "Vĩ độ phải từ -90 đến 90",
      "any.required": "Vĩ độ là bắt buộc",
    }),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      "number.base": "Kinh độ phải là số",
      "number.min": "Kinh độ phải từ -180 đến 180",
      "number.max": "Kinh độ phải từ -180 đến 180",
      "any.required": "Kinh độ là bắt buộc",
    }),

  description: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      "string.empty": "Mô tả không được để trống",
      "string.min": "Mô tả phải có ít nhất 10 ký tự",
      "string.max": "Mô tả không được vượt quá 500 ký tự",
      "any.required": "Mô tả là bắt buộc",
    }),

  peopleCount: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(1)
    .messages({
      "number.base": "Số người phải là số",
      "number.min": "Số người phải ít nhất là 1",
      "number.max": "Số người không được vượt quá 100",
    }),

  requestSupply: Joi.string()
    .max(200)
    .allow(null, "")
    .messages({
      "string.max": "Yêu cầu vật tư không được vượt quá 200 ký tự",
    }),
    requestMedia: Joi.string().max(500).allow(null, "").messages({
      "string.max": "Đường dẫn media không được vượt quá 500 ký tự",
    }),
});

export { addRequestSchema  };