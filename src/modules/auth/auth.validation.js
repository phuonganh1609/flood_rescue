const Joi = require("joi");

/**
 * Validation schema cho register
 */
const registerSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Họ tên không được để trống",
    "string.min": "Họ tên phải có ít nhất 2 ký tự",
    "string.max": "Họ tên không được vượt quá 100 ký tự",
    "any.required": "Họ tên là bắt buộc",
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email không được để trống",
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
  }),
  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10,11}$/)
    .required()
    .messages({
      "string.empty": "Số điện thoại không được để trống",
      "string.pattern.base": "Số điện thoại phải có 10-11 chữ số",
      "any.required": "Số điện thoại là bắt buộc",
    }),
  password: Joi.string().min(6).max(100).required().messages({
    "string.empty": "Mật khẩu không được để trống",
    "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
    "string.max": "Mật khẩu không được vượt quá 100 ký tự",
    "any.required": "Mật khẩu là bắt buộc",
  }),
  role: Joi.string()
    .valid("Citizen", "Rescue Team", "Rescue Coordinator", "Admin", "Manager")
    .default("Citizen")
    .messages({
      "any.only": "Role không hợp lệ",
    }),
});

/**
 * Validation schema cho login
 */
const loginSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10,11}$/)
    .required()
    .messages({
      "string.empty": "Số điện thoại không được để trống",
      "string.pattern.base": "Số điện thoại phải có 10-11 chữ số",
      "any.required": "Số điện thoại là bắt buộc",
    }),
  password: Joi.string().required().messages({
    "string.empty": "Mật khẩu không được để trống",
    "any.required": "Mật khẩu là bắt buộc",
  }),
});

/**
 * Validation schema cho tạo rescue team
 */
const createRescueTeamSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    "string.empty": "Tên đội cứu hộ không được để trống",
    "string.min": "Tên đội cứu hộ phải có ít nhất 3 ký tự",
    "string.max": "Tên đội cứu hộ không được vượt quá 100 ký tự",
    "any.required": "Tên đội cứu hộ là bắt buộc",
  }),
  status: Joi.string().valid("Active", "Inactive").default("Active").messages({
    "any.only": "Trạng thái phải là Active hoặc Inactive",
  }),
});

/**
 * Validation schema cho thêm thành viên vào team
 */
const addMemberTeamSchema = Joi.object({
  memberName: Joi.string().required().messages({
    "string.empty": "Tên thành viên không được để trống",
    "any.required": "Tên thành viên là bắt buộc",
  }),
  teamName: Joi.string().required().messages({
    "string.empty": "Tên đội cứu hộ không được để trống",
    "any.required": "Tên đội cứu hộ là bắt buộc",
  }),
  memberRole: Joi.string()
    .valid("Leader", "Member", "Driver", "Medic")
    .default("Member")
    .messages({
      "any.only": "Role trong team không hợp lệ",
    }),
});

/**
 * Validation schema cho thêm request
 */
const addRequestSchema = Joi.object({
  type: Joi.string().valid("Rescue", "Relief").required().messages({
    "string.empty": "Loại yêu cầu không được để trống",
    "any.only": "Loại yêu cầu phải là Rescue hoặc Relief",
    "any.required": "Loại yêu cầu là bắt buộc",
  }),
  latitude: Joi.number().min(-90).max(90).required().messages({
    "number.base": "Vĩ độ phải là số",
    "number.min": "Vĩ độ phải từ -90 đến 90",
    "number.max": "Vĩ độ phải từ -90 đến 90",
    "any.required": "Vĩ độ là bắt buộc",
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    "number.base": "Kinh độ phải là số",
    "number.min": "Kinh độ phải từ -180 đến 180",
    "number.max": "Kinh độ phải từ -180 đến 180",
    "any.required": "Kinh độ là bắt buộc",
  }),
  description: Joi.string().min(10).max(500).required().messages({
    "string.empty": "Mô tả không được để trống",
    "string.min": "Mô tả phải có ít nhất 10 ký tự",
    "string.max": "Mô tả không được vượt quá 500 ký tự",
    "any.required": "Mô tả là bắt buộc",
  }),
  requestSupply: Joi.string().max(200).allow(null, "").messages({
    "string.max": "Yêu cầu vật tư không được vượt quá 200 ký tự",
  }),
  requestMedia: Joi.string().uri().allow(null, "").messages({
    "string.uri": "Đường dẫn media không hợp lệ",
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  createRescueTeamSchema,
  addMemberTeamSchema,
  addRequestSchema,
};
