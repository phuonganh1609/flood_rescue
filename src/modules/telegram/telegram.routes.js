import express from "express";
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";
import {
  generateLinkToken,
  getTelegramStatus,
  unlinkTelegram,
} from "./telegram.controller.js";

const router = express.Router();

const ALLOWED_ROLES = ["Rescue Coordinator", "Rescue Team"];

/**
 * POST /api/telegram/link-token
 * Tạo token liên kết Telegram (hết hạn sau 10 phút)
 */
router.post(
  "/link-token",
  authenticate,
  authorize(ALLOWED_ROLES),
  generateLinkToken
);

/**
 * GET /api/telegram/status
 * Lấy trạng thái kết nối Telegram của user hiện tại
 */
router.get(
  "/status",
  authenticate,
  authorize(ALLOWED_ROLES),
  getTelegramStatus
);

/**
 * POST /api/telegram/unlink
 * Huỷ liên kết Telegram
 */
router.post(
  "/unlink",
  authenticate,
  authorize(ALLOWED_ROLES),
  unlinkTelegram
);

export default router;
