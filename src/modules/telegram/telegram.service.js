import User from "../users/user.model.js";
import { getBotInstance } from "./telegram.bot.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1s, 2s, 4s

/**
 * Escape ký tự đặc biệt cho Telegram HTML
 */
export function escapeHTML(text) {
  if (typeof text !== "string") text = String(text ?? "");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Gửi tin nhắn Telegram với retry logic
 * @param {string|number} chatId
 * @param {string} text  - HTML formatted
 * @param {number} attempt - lần thử hiện tại (bắt đầu từ 1)
 */
async function sendWithRetry(chatId, text, attempt = 1) {
  try {
    const bot = getBotInstance();
    if (!bot) {
      console.warn("⚠️ Telegram bot instance not ready yet");
      return;
    }

    await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    return true;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ Telegram send attempt ${attempt}/${MAX_RETRIES} failed for chatId ${chatId}: ${error.message}. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendWithRetry(chatId, text, attempt + 1);
    }

    console.error(
      `❌ Telegram send FAILED after ${MAX_RETRIES} attempts for chatId ${chatId}: ${error.message}`
    );
  }
}

/**
 * Gửi tin nhắn Telegram đến chatId cụ thể
 * @param {string|number} chatId
 * @param {string} text - MarkdownV2 formatted
 */
export async function sendTelegramMessage(chatId, text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN not set, skipping Telegram notification");
    return;
  }
  if (!chatId) return;
  await sendWithRetry(chatId, text);
}

/**
 * Gửi tin nhắn Telegram đến user theo userId (tìm chatId trong DB)
 * @param {string} userId
 * @param {string} text - MarkdownV2 formatted
 */
export async function sendTelegramToUser(userId, text) {
  try {
    const user = await User.findById(userId).select("telegramChatId").lean();
    if (!user?.telegramChatId) return; // User chưa liên kết Telegram
    await sendTelegramMessage(user.telegramChatId, text);
  } catch (error) {
    console.error(`❌ Error looking up telegramChatId for userId ${userId}: ${error.message}`);
  }
}

/**
 * Gửi tin nhắn Telegram đến nhiều userIds cùng lúc
 * @param {string[]} userIds
 * @param {string} text - MarkdownV2 formatted
 */
export async function sendTelegramToUsers(userIds, text) {
  if (!userIds || userIds.length === 0) return;
  await Promise.allSettled(userIds.map((userId) => sendTelegramToUser(userId, text)));
}
