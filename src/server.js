//Khởi động server (listen port)
import "dotenv/config.js";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/database.js";
import { initializeSocket } from "./sockets/socket.server.js";

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    // Connect database
    await connectDB();

    // Create HTTP server and attach Express app
    const server = http.createServer(app);

    // Initialize Socket.io
    initializeSocket(server);

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔌 WebSocket server ready`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
