import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authRepository } from "./auth.repository.js";
import { sessionRepository } from "./session.repository.js";
import { generateToken } from "./token.util.js";

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Service cho Authentication operations
 */
class AuthService {
  /**
   * Hash password
   * @param {string} password
   * @returns {Promise<string>}
   */
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  /**
   * So sánh password
   * @param {string} password
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Đăng ký user mới
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  async register(userData) {
    const { userName, displayName, email, password, role, phoneNumber } =
      userData;

    if (!userName || !displayName || !email || !password) {
      throw new Error(
        "Không thể thiếu userName, displayName, email hoặc password",
      );
    }

    // Kiểm tra email đã tồn tại
    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new Error("Email đã được sử dụng");
    }

    // Kiểm tra phoneNumber nếu có
    if (phoneNumber) {
      const existingPhone =
        await authRepository.findUserByPhoneNumber(phoneNumber);
      if (existingPhone) {
        throw new Error("Số điện thoại đã được sử dụng");
      }
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Tạo user mới
    const newUser = await authRepository.createUser({
      userName,
      displayName,
      email,
      hashedPassword,
      role: role || "Citizen",
      phoneNumber: phoneNumber || null,
      isActive: true,
    });

    return {
      message: "Đăng ký thành công",
      userId: newUser._id,
    };
  }

  /**
   * Đăng nhập
   * @param {Object} loginData
   * @returns {Promise<Object>}
   */
  async login(loginData) {
    const { email, password } = loginData;

    // Tìm user theo email và include hashedPassword để verify
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    // Kiểm tra user có active không
    if (!user.isActive) {
      throw new Error("Tài khoản đã bị vô hiệu hóa");
    }

    // Kiểm tra password
    const isMatch = await this.comparePassword(password, user.hashedPassword);
    if (!isMatch) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    // Tạo access token
    const accessToken = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    // Tạo refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Tạo session mới để lưu refresh token
    await sessionRepository.createSession({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    return {
      accessToken,
      refreshToken, // Trả về refresh token để controller xử lý cookie
      user: {
        id: user._id,
        userName: user.userName,
        displayName: user.displayName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }

  /**
   * Lấy thông tin user hiện tại
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getCurrentUser(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }
    return user;
  }

  /**
   * Đăng xuất - xóa session
   * @param {string} refreshToken
   * @returns {Promise<Object>}
   */
  async logout(refreshToken) {
    if (!refreshToken) {
      throw new Error("Refresh token không tồn tại");
    }

    // Xóa session khỏi database
    const deletedSession =
      await sessionRepository.deleteSessionByRefreshToken(refreshToken);

    if (!deletedSession) {
      throw new Error("Session không tồn tại hoặc đã bị xóa");
    }

    return {
      message: "Đăng xuất thành công",
    };
  }

  /**
   * Refresh access token
   * @param {string} refreshToken
   * @returns {Promise<Object>}
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error("Refresh token không tồn tại");
    }

    // Tìm session trong db theo refresh token
    const session = await sessionRepository.findSessionByRefreshToken(refreshToken);
    
    if (!session) {
      throw new Error("Refresh token không hợp lệ");
    }

    // Kiểm tra session có hết hạn chưa
    if (session.expiresAt < new Date()) {
      await sessionRepository.deleteSessionByRefreshToken(refreshToken);
      throw new Error("Refresh token đã hết hạn");
    }

    // Lấy thông tin user
    const user = await authRepository.findUserById(session.userId);
    
    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }

    // Kiểm tra user còn active không
    if (!user.isActive) {
      throw new Error("Tài khoản đã bị vô hiệu hóa");
    }

    // Tạo access token mới
    const accessToken = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user._id,
        userName: user.userName,
        displayName: user.displayName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }
}

const authService = new AuthService();

export { authService };
