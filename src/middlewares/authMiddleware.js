import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";

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

export { authenticate, authorize };
