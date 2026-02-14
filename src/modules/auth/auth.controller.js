import e from "express";
import { authService } from "./auth.service.js";
import response from "../../utils/response.js";

/**
 * Controller cho Authentication
 */
export const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return response.sendSuccess(res, {
      data: result,
      statusCode: 201,
      message: "Đăng ký thành công",
    });
  } catch (error) {
    return response.sendError(res, {
      message: error.message || "Lỗi khi đăng ký",
      statusCode: 400,
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
    return response.sendSuccess(res, {
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
      message: "Đăng nhập thành công",
    });
  } catch (error) {
    return response.sendError(res, {
      message: error.message || "Lỗi khi đăng nhập",
      statusCode: 400,
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return response.sendSuccess(res, { data: user });
  } catch (error) {
    return response.sendError(res, {
      message: error.message || "Lỗi khi lấy thông tin user",
      statusCode: 404,
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Lấy refresh token từ cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return response.sendError(res, {
        message: "Không tìm thấy refresh token",
        statusCode: 400,
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

    return res.status(204).send();
  } catch (error) {
    return response.sendError(res, {
      message: error.message || "Lỗi khi đăng xuất",
      statusCode: 400,
    });
  }
};

export const refresh = async (req, res) => {
  try {
    // Lấy refresh token từ cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return response.sendError(res, {
        message: "Không tìm thấy refresh token",
        statusCode: 401,
      });
    }

    // Tạo access token mới
    const result = await authService.refreshAccessToken(refreshToken);

    // Trả về access token mới và thông tin user
    return response.sendSuccess(res, {
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
      message: "Refresh token thành công",
    });
  } catch (error) {
    return response.sendError(res, {
      message: error.message || "Lỗi khi refresh token",
      statusCode: 401,
      errorCode: "UNAUTHORIZED",
    });
  }
};
