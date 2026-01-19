//Khởi động server (listen port)
require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/database");

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
