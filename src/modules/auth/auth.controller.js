import e from "express";
import { authService } from "./auth.service.js";

/**
 * Controller cho Authentication
 */
export const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi khi đăng ký",
    });
  }
};

export const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    // Set refresh token trong HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true, // Không thể truy cập qua JavaScript
      secure: process.env.NODE_ENV === "production", // Chỉ gửi qua HTTPS trong production
      sameSite: "none", // Chống CSRF thì dùng 'strict' hoặc 'lax', nhưng nếu cần chia sẻ cookie giữa các site thì dùng 'none'
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    // Chỉ trả accessToken và user info trong response body
    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi khi đăng nhập",
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(404).json({
      message: error.message || "Lỗi khi lấy thông tin user",
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Lấy refresh token từ cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        message: "Không tìm thấy refresh token",
      });
    }

    // Xóa refresh token khỏi database
    await authService.logout(refreshToken);

    // Xóa cookie trên trình duyệt
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    return res.sendStatus(204);
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Lỗi khi đăng xuất",
    });
  }
};

export const refresh = async (req, res) => {
  try {
    // Lấy refresh token từ cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Không tìm thấy refresh token",
      });
    }

    // Tạo access token mới
    const result = await authService.refreshAccessToken(refreshToken);

    // Trả về access token mới và thông tin user
    return res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return res.status(401).json({
      message: error.message || "Lỗi khi refresh token",
    });
  }
};
