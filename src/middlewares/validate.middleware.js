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
      const validationDetails = error.details.map((detail) => {
        const fieldPath = detail.path?.length > 0 ? detail.path.join(".") : "unknown";
        return {
          field: fieldPath,
          message: detail.message,
          type: detail.type,
        };
      });

      const summaryMessage = validationDetails
        .map((item) => `${item.field}: ${item.message}`)
        .join("; ");

      return res.status(400).json({
        success: false,
        message: summaryMessage || "Dữ liệu gửi lên không hợp lệ",
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          details: validationDetails,
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
