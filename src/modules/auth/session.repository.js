import Session from "./session.model.js";

/**
 * Repository cho Session operations
 */
class SessionRepository {
  /**
   * Tạo session mới
   * @param {Object} sessionData
   * @param {string} sessionData.userId - User ID
   * @param {string} sessionData.refreshToken - Refresh token
   * @param {Date} sessionData.expiresAt - Expiration date
   * @returns {Promise<Object>}
   */
  async createSession(sessionData) {
    return await Session.create(sessionData);
  }

  /**
   * Tìm session theo refresh token
   * @param {string} refreshToken
   * @returns {Promise<Object|null>}
   */
  async findSessionByRefreshToken(refreshToken) {
    return await Session.findOne({ refreshToken });
  }

  /**
   * Tìm tất cả sessions của user
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async findSessionsByUserId(userId) {
    return await Session.find({ userId });
  }

  /**
   * Xóa session theo refresh token
   * @param {string} refreshToken
   * @returns {Promise<Object|null>}
   */
  async deleteSessionByRefreshToken(refreshToken) {
    return await Session.findOneAndDelete({ refreshToken });
  }

  /**
   * Xóa tất cả sessions của user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async deleteSessionsByUserId(userId) {
    return await Session.deleteMany({ userId });
  }

  /**
   * Xóa các sessions đã hết hạn
   * @returns {Promise<Object>}
   */
  async deleteExpiredSessions() {
    return await Session.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}

const sessionRepository = new SessionRepository();

export { sessionRepository };
