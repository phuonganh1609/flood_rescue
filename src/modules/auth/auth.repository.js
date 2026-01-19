const User = require("../users/user.model");
const RescueTeam = require("../teams/teamRescue.model");
const TeamMember = require("../teams/teamMember.model");
const RequestMission = require("../requests/request.model");

/**
 * Repository cho User operations
 */
class AuthRepository {
  /**
   * Tìm user theo email
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
    return await User.findById(userId).select("-password");
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

/**
 * Repository cho RescueTeam operations
 */
class RescueTeamRepository {
  /**
   * Tìm rescue team theo tên
   * @param {string} name
   * @returns {Promise<Object|null>}
   */
  async findTeamByName(name) {
    return await RescueTeam.findOne({ name });
  }

  /**
   * Tạo rescue team mới
   * @param {Object} teamData
   * @returns {Promise<Object>}
   */
  async createTeam(teamData) {
    const team = new RescueTeam(teamData);
    return await team.save();
  }

  /**
   * Cập nhật rescue team
   * @param {string} teamId
   * @param {Object} updateData
   * @returns {Promise<Object|null>}
   */
  async updateTeam(teamId, updateData) {
    return await RescueTeam.findByIdAndUpdate(teamId, updateData, {
      new: true,
    });
  }

  /**
   * Lấy danh sách tất cả teams
   * @returns {Promise<Array>}
   */
  async getAllTeams() {
    return await RescueTeam.find();
  }
}

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
}

module.exports = {
  authRepository: new AuthRepository(),
  rescueTeamRepository: new RescueTeamRepository(),
  teamMemberRepository: new TeamMemberRepository(),
  requestRepository: new RequestRepository(),
};
