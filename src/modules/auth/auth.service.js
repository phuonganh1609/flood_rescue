import bcrypt from "bcryptjs";
import {
  authRepository,
  rescueTeamRepository,
  teamMemberRepository,
  requestRepository,
} from "./auth.repository.js";
import { generateToken } from "./token.util.js";

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
    const { fullName, email, password, role, phoneNumber } = userData;

    // Kiểm tra email hoặc phone đã tồn tại
    const existingUser = await authRepository.findUserByEmailOrPhone(
      email,
      phoneNumber,
    );

    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error("Email đã được sử dụng");
      }
      if (existingUser.phoneNumber === phoneNumber) {
        throw new Error("Số điện thoại đã được sử dụng");
      }
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Tạo user mới
    const newUser = await authRepository.createUser({
      fullName,
      email,
      password: hashedPassword,
      role: role || "Citizen",
      phoneNumber,
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
    const { phoneNumber, password } = loginData;

    // Tìm user
    const user = await authRepository.findUserByPhoneNumber(phoneNumber);
    if (!user) {
      throw new Error("Tên người dùng hoặc mật khẩu không đúng");
    }

    // Kiểm tra password
    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) {
      throw new Error("Tên người dùng hoặc mật khẩu không đúng");
    }

    // Generate token
    const token = generateToken({
      id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    return {
      token,
      message: "Đăng nhập thành công",
      role: user.role,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
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
}

/**
 * Service cho RescueTeam operations
 */
class RescueTeamService {
  /**
   * Tạo rescue team
   * @param {Object} teamData
   * @returns {Promise<Object>}
   */
  async createRescueTeam(teamData) {
    const { name, status } = teamData;

    // Kiểm tra team đã tồn tại
    const existingTeam = await rescueTeamRepository.findTeamByName(name);
    if (existingTeam) {
      throw new Error("Đội cứu hộ với tên này đã tồn tại");
    }

    // Tạo team mới
    const newTeam = await rescueTeamRepository.createTeam({
      name,
      status: status || "Active",
    });

    return {
      message: "Tạo đội cứu hộ thành công",
      teamId: newTeam._id,
    };
  }

  /**
   * Thêm member vào team
   * @param {Object} memberData
   * @returns {Promise<Object>}
   */
  async addMemberToTeam(memberData) {
    const { memberName, teamName, memberRole } = memberData;

    // Kiểm tra user tồn tại
    const user = await authRepository.findUserByEmailOrPhone(
      memberName,
      memberName,
    );
    if (!user || user.fullName !== memberName) {
      // Tìm theo fullName
      const userByName = await authRepository.findUserById(memberName);
      if (!userByName) {
        throw new Error("User không tồn tại");
      }
    }

    // Kiểm tra team tồn tại
    const team = await rescueTeamRepository.findTeamByName(teamName);
    if (!team) {
      throw new Error("Rescue team không tồn tại");
    }

    // Kiểm tra user đã thuộc team chưa
    const existingMember = await teamMemberRepository.findMemberInTeam(
      memberName,
      teamName,
    );
    if (existingMember) {
      throw new Error("User đã là thành viên của team này");
    }

    // Thêm member
    const newMember = await teamMemberRepository.addMemberToTeam({
      userName: memberName,
      rescueTeamName: teamName,
      roleTeam: memberRole || "Member",
    });

    return {
      message: "Thêm thành viên thành công",
      data: newMember,
    };
  }
}

/**
 * Service cho Request operations
 */
class RequestService {
  async createRequest(userId, requestData, files) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new Error("User không tồn tại");

    const {
      type,
      latitude,
      longitude,
      description,
      peopleCount,
      requestSupply,
    } = requestData;

    const newRequest = await requestRepository.createRequest({
      userName: user.fullName,
      type,
      latitude,
      longitude,
      description,
      peopleCount: peopleCount || 1,
      requestSupply: requestSupply || null,
    });

    const uploadedFiles = [];

    if (files.length > 0) {
      for (const file of files) {
        const media = await uploadFileForUser({
          userId,
          scope: "requests",
          refId: newRequest.id,
          file,
        });

        uploadedFiles.push({
          requestId: newRequest.id,
          ...media,
        });
      }

      await requestRepository.createRequestMedia(uploadedFiles);
    }

    return {
      message: "Tạo request thành công",
      data: {
        ...newRequest,
        media: uploadedFiles,
      },
    };
  }
}

