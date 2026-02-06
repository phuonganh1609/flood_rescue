import jwt from "jsonwebtoken";

/**
 * Authenticate WebSocket connections using JWT
 * @param {Object} socket - Socket.io socket instance
 * @param {Function} next - Next middleware function
 */
export const socketAuthMiddleware = (socket, next) => {
  try {
    // Get token from auth object or query string
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Authentication required: No token provided"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to socket
    socket.user = decoded.user;
    socket.userId = decoded.user.id || decoded.user._id;
    socket.userRole = decoded.user.role;

    next();
  } catch (error) {
    console.error("Socket authentication failed:", error.message);
    next(new Error("Authentication failed: Invalid token"));
  }
};
