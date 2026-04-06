import crypto from "crypto";
import User from "../users/user.model.js";

const LINK_TOKEN_EXPIRY_MINUTES = 10;

/**
 * Tạo token liên kết Telegram (10 phút)
 * POST /api/telegram/link-token
 */
export async function generateLinkToken(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Tạo token ngẫu nhiên 8 bytes (16 ký tự hex)
    const token = crypto.randomBytes(8).toString("hex");
    const expiresAt = new Date(Date.now() + LINK_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    user.telegramLinkToken = token;
    user.telegramLinkTokenExpiry = expiresAt;
    await user.save();

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "";

    return res.status(200).json({
      token,
      botUsername,
      command: `/link ${token}`,
      expiresAt,
      expiresInMinutes: LINK_TOKEN_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error("Error generating Telegram link token:", error.message);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Lấy trạng thái kết nối Telegram của user hiện tại
 * GET /api/telegram/status
 */
export async function getTelegramStatus(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("telegramChatId updatedAt").lean();
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    return res.status(200).json({
      linked: !!user.telegramChatId,
    });
  } catch (error) {
    console.error("Error getting Telegram status:", error.message);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

/**
 * Huỷ liên kết Telegram (từ FE)
 * POST /api/telegram/unlink
 */
export async function unlinkTelegram(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    if (!user.telegramChatId) {
      return res.status(400).json({ message: "Tài khoản chưa được liên kết với Telegram" });
    }

    user.telegramChatId = null;
    user.telegramLinkToken = null;
    user.telegramLinkTokenExpiry = null;
    await user.save();

    return res.status(200).json({ message: "Đã huỷ liên kết Telegram thành công" });
  } catch (error) {
    console.error("Error unlinking Telegram:", error.message);
    return res.status(500).json({ message: "Lỗi server" });
  }
}
