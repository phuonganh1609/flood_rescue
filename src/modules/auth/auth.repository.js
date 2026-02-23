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
   * Tìm user theo role
   * @param {string} role
   * @returns {Promise<Array>}
   */
  async findUsersByRole(role) {
    return await User.find({ role }).select("-hashedPassword");
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

  /**
   * Tìm kiếm citizen theo displayName hoặc phoneNumber
   * @param {string} query - search keyword
   * @returns {Promise<Array>}
   */
  async searchCitizens(query) {
    const regex = new RegExp(query, "i");
    return await User.find({
      role: "Citizen",
      isActive: true,
      $or: [{ displayName: regex }, { phoneNumber: regex }],
    })
      .select("displayName userName phoneNumber email")
      .limit(10);
  }
}

<<<<<<< HEAD
/**
 * Repository cho TeamMember operations
 */
class TeamMemberRepository {
  /**
   * Tìm member trong team
   * @param {string} userName
   * @param {string} rescueTeamName
   * @returns {Promise<Object|null>}
   */
  async findMemberInTeam(userName, rescueTeamName) {
    return await TeamMember.findOne({
      userName,
      rescueTeamName,
    });
  }

  /**
   * Thêm member vào team
   * @param {Object} memberData
   * @returns {Promise<Object>}
   */
  async addMemberToTeam(memberData) {
    return await TeamMember.create(memberData);
  }

  /**
   * Lấy danh sách members của team
   * @param {string} rescueTeamName
   * @returns {Promise<Array>}
   */
  async getTeamMembers(rescueTeamName) {
    return await TeamMember.find({ rescueTeamName });
  }

  /**
   * Xóa member khỏi team
   * @param {string} userName
   * @param {string} rescueTeamName
   * @returns {Promise<Object|null>}
   */
  async removeMemberFromTeam(userName, rescueTeamName) {
    return await TeamMember.findOneAndDelete({
      userName,
      rescueTeamName,
    });
  }
}

/**
 * Repository cho Request operations
 */
class RequestRepository {
  /**
   * Tạo request mới
   * @param {Object} requestData
   * @returns {Promise<Object>}
   */
  async createRequest(requestData) {
    return await RequestMission.create(requestData);
  }

  /**
   * Tìm request theo ID
   * @param {string} requestId
   * @returns {Promise<Object|null>}
   */
  async findRequestById(requestId) {
    return await RequestMission.findById(requestId);
  }

  /**
   * Lấy requests của user
   * @param {string} userName
   * @returns {Promise<Array>}
   */
  async getRequestsByUser(userName) {
    return await RequestMission.find({ userName });
  }

  /**
   * Cập nhật request
   * @param {string} requestId
   * @param {Object} updateData
   * @returns {Promise<Object|null>}
   */
  async updateRequest(requestId, updateData) {
    return await RequestMission.findByIdAndUpdate(requestId, updateData, {
      new: true,
    });
  }

    /**
   * Lưu danh sách media của request
   * @param {Array<Object>} mediaList
   */
  async createRequestMedia(mediaList) {
    if (!mediaList || mediaList.length === 0) return [];

    return await prisma.requestMedia.createMany({
      data: mediaList,
    });
  }
}

export {
  AuthRepository,
  RescueTeamRepository,
  TeamMemberRepository,
  RequestRepository,
};

=======
>>>>>>> d32bbffa137e8b9f1b01ef9648d7ee13aa68177b
const authRepository = new AuthRepository();

export { authRepository };
