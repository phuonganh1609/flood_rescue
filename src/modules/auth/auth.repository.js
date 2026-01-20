import User from "../users/user.model.js";

/**
 * Repository cho User operations
 */
class AuthRepository {
  /**
   * Tìm user theo email (bao gồm hashedPassword để verify login)
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findUserByEmail(email) {
    return await User.findOne({ email });
  }

  /**
   * Tìm user theo phone number
   * @param {string} phoneNumber
   * @returns {Promise<Object|null>}
   */
  async findUserByPhoneNumber(phoneNumber) {
    return await User.findOne({ phoneNumber });
  }

  /**
   * Tìm user theo email hoặc phone number
   * @param {string} email
   * @param {string} phoneNumber
   * @returns {Promise<Object|null>}
   */
  async findUserByEmailOrPhone(email, phoneNumber) {
    return await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });
  }

  /**
   * Tìm user theo ID
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async findUserById(userId) {
    return await User.findById(userId).select("-hashedPassword");
  }

  /**
   * Tạo user mới
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    const user = new User(userData);
    return await user.save();
  }

  /**
   * Cập nhật user
   * @param {string} userId
   * @param {Object} updateData
   * @returns {Promise<Object|null>}
   */
  async updateUser(userId, updateData) {
    return await User.findByIdAndUpdate(userId, updateData, { new: true });
  }
}

const authRepository = new AuthRepository();

export { authRepository };
