import response from "../utils/response.js";

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found middleware - catches 404 errors
 */
export const notFound = (req, res, next) => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    "ROUTE_NOT_FOUND",
  );
  next(error);
};

/**
 * Global error handler middleware
 * Must be the last middleware in the app
 */
export const errorHandler = (err, req, res, next) => {
  // Set default values
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || "INTERNAL_ERROR";
  let message = err.message || "Internal Server Error";

  // Handle specific error types
  if (err.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  } else if (err.name === "CastError") {
    // Mongoose bad ObjectId
    statusCode = 400;
    errorCode = "INVALID_ID";
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // Mongoose duplicate key error
    statusCode = 400;
    errorCode = "DUPLICATE_ERROR";
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  } else if (err.name === "JsonWebTokenError") {
    // JWT error
    statusCode = 401;
    errorCode = "INVALID_TOKEN";
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    // JWT expired
    statusCode = 401;
    errorCode = "TOKEN_EXPIRED";
    message = "Token has expired";
  }

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", {
      message: err.message,
      stack: err.stack,
      statusCode,
      errorCode,
    });
  }

  // Send error response using standardized response
  return response.sendError(res, {
    message,
    statusCode,
    errorCode,
    errors: process.env.NODE_ENV === "development" ? err.stack : null,
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  AppError,
  notFound,
  errorHandler,
  catchAsync,
};
