/**
 * Middleware để validate request body sử dụng Joi schemas
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Trả về tất cả errors, không dừng ở error đầu tiên
      stripUnknown: true, // Loại bỏ các fields không có trong schema
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        message: "Validation error",
        errors: errorMessages,
      });
    }

    // Replace req.body với validated value
    req.body = value;
    next();
  };
};

module.exports = { validate };
