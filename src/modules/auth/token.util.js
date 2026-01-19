const jwt = require("jsonwebtoken");

/**
 * Generate JWT access token
 * @param {Object} payload - User data to encode
 * @param {string} payload.id - User ID
 * @param {string} payload.phoneNumber - User phone number
 * @param {string} payload.role - User role
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  const tokenPayload = {
    user: {
      id: payload.id,
      phoneNumber: payload.phoneNumber,
      role: payload.role,
    },
  };

  return jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token đã hết hạn");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Token không hợp lệ");
    }
    throw error;
  }
};

/**
 * Decode JWT token without verification (use with caution)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null if not found
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
};
