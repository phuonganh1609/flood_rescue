import TelegramBot from "node-telegram-bot-api";
import User from "../users/user.model.js";

let botInstance = null;

/**
 * Khởi tạo Telegram Bot với long-polling
 */
export async function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn("⚠️  TELEGRAM_BOT_TOKEN not set - Telegram bot will not start");
    return;
  }

  try {
    botInstance = new TelegramBot(token, { polling: false });

    // Drop pending updates & clear any existing webhook to avoid 409 Conflict on restart
    await botInstance.deleteWebhook({ drop_pending_updates: true });

    // Start polling after clearing
    botInstance.startPolling();

    // ─── /start ─────────────────────────────────────────────────
    botInstance.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      botInstance.sendMessage(
        chatId,
        `🌊 *Chào mừng đến với Flood Rescue Bot\\!*\n\n` +
          `Bot này gửi thông báo hệ thống cứu hộ lũ lụt đến bạn\\.\n\n` +
          `*Cách liên kết tài khoản:*\n` +
          `1\\. Vào trang Hồ sơ trên web\n` +
          `2\\. Chọn *"Kết nối Telegram"*\n` +
          `3\\. Copy lệnh hiển thị và gửi cho bot này\n\n` +
          `Ví dụ: \`/link abc123xyz\``,
        { parse_mode: "MarkdownV2" }
      );
    });

    // ─── /link <token> ───────────────────────────────────────────
    botInstance.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const token = match[1]?.trim();

      if (!token) {
        return botInstance.sendMessage(chatId, "❌ Vui lòng cung cấp token\\. Ví dụ: `/link abc123`", {
          parse_mode: "MarkdownV2",
        });
      }

      try {
        const user = await User.findOne({
          telegramLinkToken: token,
          telegramLinkTokenExpiry: { $gt: new Date() },
        });

        if (!user) {
          return botInstance.sendMessage(
            chatId,
            "❌ *Token không hợp lệ hoặc đã hết hạn\\.*\n\nVui lòng tạo token mới trên trang Hồ sơ\\.",
            { parse_mode: "MarkdownV2" }
          );
        }

        // Lưu chatId và xóa token cũ
        user.telegramChatId = String(chatId);
        user.telegramLinkToken = null;
        user.telegramLinkTokenExpiry = null;
        await user.save();

        const displayName = user.displayName || user.userName || "bạn";
        botInstance.sendMessage(
          chatId,
          `✅ *Liên kết thành công\\!*\n\n` +
            `Xin chào *${escapeForTelegram(displayName)}*\\!\n` +
            `Tài khoản của bạn đã được kết nối với Telegram\\.\n` +
            `Từ nay bạn sẽ nhận được thông báo hệ thống cứu hộ tại đây\\.`,
          { parse_mode: "MarkdownV2" }
        );

        console.log(`✅ Telegram linked: userId=${user._id}, chatId=${chatId}`);
      } catch (error) {
        console.error("❌ Error processing /link command:", error.message);
        botInstance.sendMessage(chatId, "❌ Có lỗi xảy ra\\. Vui lòng thử lại sau\\.", {
          parse_mode: "MarkdownV2",
        });
      }
    });

    // ─── /unlink ─────────────────────────────────────────────────
    botInstance.onText(/\/unlink/, async (msg) => {
      const chatId = String(msg.chat.id);

      try {
        const user = await User.findOne({ telegramChatId: chatId });

        if (!user) {
          return botInstance.sendMessage(
            chatId,
            "⚠️ Tài khoản của bạn chưa được liên kết với hệ thống\\.",
            { parse_mode: "MarkdownV2" }
          );
        }

        user.telegramChatId = null;
        await user.save();

        botInstance.sendMessage(
          chatId,
          "✅ *Đã huỷ liên kết thành công\\.*\n\nBạn sẽ không còn nhận thông báo qua Telegram nữa\\.",
          { parse_mode: "MarkdownV2" }
        );

        console.log(`🔓 Telegram unlinked: userId=${user._id}`);
      } catch (error) {
        console.error("❌ Error processing /unlink command:", error.message);
        botInstance.sendMessage(chatId, "❌ Có lỗi xảy ra\\. Vui lòng thử lại sau\\.", {
          parse_mode: "MarkdownV2",
        });
      }
    });

    // ─── Error handler ───────────────────────────────────────────
    botInstance.on("polling_error", (error) => {
      console.error("❌ Telegram polling error:", error.message);
    });

    console.log("🤖 Telegram Bot started (polling mode)");
  } catch (error) {
    console.error("❌ Failed to initialize Telegram Bot:", error.message);
  }
}

/**
 * Lấy instance bot hiện tại (nếu cần dùng ở nơi khác)
 */
export function getBotInstance() {
  return botInstance;
}

/**
 * Helper escape MarkdownV2 nội bộ (tránh circular import từ service)
 */
function escapeForTelegram(text) {
  if (typeof text !== "string") text = String(text ?? "");
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}
