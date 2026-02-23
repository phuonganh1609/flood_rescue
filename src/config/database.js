import mongoose from "mongoose";

/**
 * Kết nối MongoDB
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const connectionString = process.env.MONGODB_CONNECTIONSTRING;

    if (!connectionString) {
      throw new Error("MongoDB connection string is not defined in .env file");
    }

    await mongoose.connect(connectionString, {
      // Các options này đã deprecated từ MongoDB driver 4.0+
      // Chỉ giữ lại nếu cần thiết
    });

    console.log("✅ MongoDB connected successfully");
    console.log(`📦 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error; // Throw error để server.js xử lý
  }
};

// Handle MongoDB connection events
mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB error:", error);
});

export { connectDB };
