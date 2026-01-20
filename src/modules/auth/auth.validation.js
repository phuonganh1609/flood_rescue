import Joi from "joi";

/**
 * Validation schema cho register
 */
const registerSchema = Joi.object({
  userName: Joi.string().min(3).max(50).required().messages({
    "string.empty": "Tên đăng nhập không được để trống",
    "string.min": "Tên đăng nhập phải có ít nhất 3 ký tự",
    "string.max": "Tên đăng nhập không được vượt quá 50 ký tự",
    "any.required": "Tên đăng nhập là bắt buộc",
  }),
  displayName: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Tên hiển thị không được để trống",
    "string.min": "Tên hiển thị phải có ít nhất 2 ký tự",
    "string.max": "Tên hiển thị không được vượt quá 100 ký tự",
    "any.required": "Tên hiển thị là bắt buộc",
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email không được để trống",
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
  }),
  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10,11}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base": "Số điện thoại phải có 10-11 chữ số",
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
  email: Joi.string().email().required().messages({
    "string.empty": "Email không được để trống",
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Mật khẩu không được để trống",
    "any.required": "Mật khẩu là bắt buộc",
  }),
});

export { registerSchema, loginSchema };
