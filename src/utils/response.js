/**
 * Standard API response
 */

const sendSuccess = (
  res,
  { data = null, message = "Success", statusCode = 200, meta = null } = {},
) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta) response.meta = meta;

  return res.status(statusCode).json(response);
};

const sendError = (
  res,
  {
    message = "Internal Server Error",
    statusCode = 500,
    errorCode = "INTERNAL_ERROR",
    errors = null,
  } = {},
) => {
  const response = {
    success: false,
    message,
    data: null,
    error: {
      code: errorCode,
    },
  };

  if (errors) response.error.details = errors;

  return res.status(statusCode).json(response);
};

export default {
  sendSuccess,
  sendError,
};
