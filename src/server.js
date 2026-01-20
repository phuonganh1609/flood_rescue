//Khởi động server (listen port)
import "dotenv/config.js";
import app from "./app.js";
import { connectDB } from "./config/database.js";

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    // Connect database
    await connectDB();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
