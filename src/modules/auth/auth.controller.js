const {
  authService,
  rescueTeamService,
  requestService,
} = require("./auth.service");

/**
 * Controller cho Authentication
 */
exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi khi đăng ký",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi khi đăng nhập",
    });
  }
};

exports.getUser = async (req, res) => {
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
exports.createRescueTeam = async (req, res) => {
  try {
    const result = await rescueTeamService.createRescueTeam(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi khi tạo đội cứu hộ",
    });
  }
};

exports.addMemberTeam = async (req, res) => {
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
exports.addRequest = async (req, res) => {
  try {
    const result = await requestService.createRequest(req.user.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi khi tạo yêu cầu",
    });
  }
};
