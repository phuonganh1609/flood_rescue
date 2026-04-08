import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB } from "./src/config/database.js";
import { initTelegramBot } from "./src/modules/telegram/telegram.bot.js";
import { sendTelegramToUser } from "./src/modules/telegram/telegram.service.js";
import User from "./src/modules/users/user.model.js";

async function run() {
  await connectDB();
  
  // Phải đợi init xong
  initTelegramBot();
  await new Promise(r => setTimeout(r, 1000));
  
  const user = await User.findOne({ telegramChatId: { $ne: null } });
  if (user) {
    console.log("Found user with telegram:", user._id, user.telegramChatId);
    
    const { escapeHTML } = await import("./src/modules/telegram/telegram.service.js");
    const emoji = "🆘";
    const title = "Yêu cầu cứu hộ mới";
    const body = "Có yêu cầu cứu hộ mới cần xác minh";
    
    // Test HTML format
    const msg = `${emoji} <b>${escapeHTML(title)}</b>\n${escapeHTML(body)}`;
    console.log("Raw msg:", msg);
    
    await sendTelegramToUser(user._id, msg);
    console.log("Send complete.");
  } else {
    console.log("No user with telegramChatId found.");
  }
  
  process.exit(0);
}

run();
