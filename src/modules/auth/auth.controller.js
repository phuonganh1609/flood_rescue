import {
  authService,
  rescueTeamService,
  requestService,
} from "./auth.service.js";
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
    res.json(result);
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

/**
 * Controller cho RescueTeam
 */
export const createRescueTeam = async (req, res) => {
  try {
    const result = await rescueTeamService.createRescueTeam(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi khi tạo đội cứu hộ",
    });
  }
};

export const addMemberTeam = async (req, res) => {
  try {
    const result = await rescueTeamService.addMemberToTeam(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi khi thêm thành viên",
    });
  }
};

/**
 * Controller cho Request
 */
export const addRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files || [];

    const result = await requestService.createRequest(
      userId,
      req.body,
      files
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};