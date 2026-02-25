import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";
import Team from "../modules/teams/team.model.js";

// Middleware xác thực người dùng bằng JWT
const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Không có token, truy cập bị từ chối" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// Middleware kiểm tra role của user, để phân quyền truy cập
const authorize = (allowedRoles) => (req, res, next) => {
  // 1. Log role của user hiện tại
  console.log("Authorizing user with role:", req.user.role);

  // 2. Log các roles được phép truy cập
  console.log("Allowed roles for this route:", allowedRoles.join(", "));

  // 3. Kiểm tra role của user có nằm trong danh sách cho phép không
  if (!allowedRoles.includes(req.user.role)) {
    console.log("Access denied: User role not authorized.");
    return res.status(403).json({ message: "Access denied" });
  }

  // 4. Nếu OK, cho phép tiếp tục
  console.log("User authorized, proceeding to the next middleware.");
  next();
};

/**
 * Middleware: Kiểm tra user là member của team (theo teamId param).
 * - Coordinator / Admin: bypass (không cần thuộc team).
 * - Rescue Team: phải có user.teamId === req.params.teamId.
 */
const authorizeTeamMember = async (req, res, next) => {
  try {
    const bypassRoles = ["Rescue Coordinator", "Admin"];
    if (bypassRoles.includes(req.user.role)) return next();

    const { teamId } = req.params;
    const user = await User.findById(req.user.id).select("teamId");

    if (!user || !user.teamId || user.teamId.toString() !== teamId) {
      return res
        .status(403)
        .json({ message: "You are not a member of this team" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Middleware: Kiểm tra user là leader của team (theo teamId param).
 * - Coordinator / Admin: bypass (không cần là leader).
 * - Rescue Team: phải là leaderId của team đó.
 */
const authorizeTeamLeader = async (req, res, next) => {
  try {
    const bypassRoles = ["Rescue Coordinator", "Admin"];
    if (bypassRoles.includes(req.user.role)) return next();

    const { teamId } = req.params;
    const team = await Team.findById(teamId).select("leaderId");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.leaderId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only the team leader can perform this action" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export { authenticate, authorize, authorizeTeamMember, authorizeTeamLeader };
