/**
 * Middleware để validate request sử dụng Joi schemas
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Nguồn dữ liệu cần validate: 'body' (default), 'query', 'params'
 * @returns {Function} Express middleware
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Trả về tất cả errors, không dừng ở error đầu tiên
      stripUnknown: true, // Loại bỏ các fields không có trong schema
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          details: errorMessages,
        },
      });
    }

    // Replace source data với validated value
    // req.query và req.params là getter-only trên IncomingMessage, không thể gán trực tiếp
    if (source === "body") {
      req.body = value;
    } else {
      // Mutate in-place: xóa keys cũ rồi gán value đã validate
      Object.keys(req[source]).forEach((k) => delete req[source][k]);
      Object.assign(req[source], value);
    }
    next();
  };
};

export { validate };
