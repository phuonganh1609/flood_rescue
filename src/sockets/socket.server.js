import { Server } from "socket.io";
import { socketAuthMiddleware } from "./socket.auth.js";

/** @type {Server|null} */
let io = null;

/**
 * Initialize Socket.io server
 * @param {import("http").Server} httpServer - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export function initializeSocket(httpServer) {
  // Configure allowed origins (same as Express CORS)
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Apply JWT authentication middleware
  io.use(socketAuthMiddleware);

  // Handle connections
  io.on("connection", (socket) => {
    const { userId, userRole } = socket;
    console.log(
      `🔌 Socket connected: ${socket.id} | User: ${userId} | Role: ${userRole}`,
    );

    // Join user to personal room (for targeted notifications)
    socket.join(`user:${userId}`);

    // Join user to role-based room (for role-targeted notifications)
    socket.join(`role:${userRole}`);

    // Send unread count on connection
    socket.emit("CONNECTED", {
      message: "WebSocket connection established",
      userId,
      userRole,
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log("✅ Socket.io server initialized");
  return io;
}

/**
 * Get the Socket.io server instance
 * @returns {Server|null}
 */
export function getIO() {
  return io;
}
