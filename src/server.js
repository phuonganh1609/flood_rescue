//Khởi động server (listen port)
import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/database.js";
import { initializeSocket } from "./sockets/socket.server.js";
import { initTelegramBot } from "./modules/telegram/telegram.bot.js";

// Load .env.test for test runs, otherwise default to .env
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    // Connect database
    await connectDB();

    // Create HTTP server and attach Express app
    const server = http.createServer(app);

    // Initialize Socket.io
    initializeSocket(server);

    // Initialize Telegram Bot (polling)
    initTelegramBot();

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
