import mongoose from "mongoose";
import { userService } from "./user.service.js";
import response from "../../utils/response.js";




export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  const user = await userService.createUser({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role,
  }, req.user.id);

  res.json(user);
};
/**
 * GET /api/users
 * List all users with filters, search, and pagination
 * Auth: Admin only
 */
export const listUsers = async (req, res) => {
  try {
    const { role, isActive, search, page, limit, sort } = req.query;
    const requesterRole = req.user.role;

    const result = await userService.listUsers({
      role,
      isActive,
      search,
      page,
      limit,
      sort,
      requesterRole,
    });

    const { data, ...pagination } = result;

    return response.sendSuccess(res, {
      data,
      message: "Users retrieved successfully",
      meta: pagination,
    });
  } catch (err) {
    return response.sendError(res, {
      message: err.message,
      statusCode: 400,
    });
  }
};

/**
 * PATCH /api/users/:id/role
 * Update a user's role
 * Auth: Admin only
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    const updatedUser = await userService.updateUserRole(id, role, adminId);

    return response.sendSuccess(res, {
      data: updatedUser,
      message: `User role updated to "${role}" successfully`,
    });
  } catch (err) {
    const statusMap = {
      "Cannot change your own role": 403,
      "User not found": 404,
    };

    const statusCode = statusMap[err.message] || 400;

    return response.sendError(res, {
      message: err.message,
      statusCode,
      errorCode:
        statusCode === 403
          ? "FORBIDDEN"
          : statusCode === 404
            ? "NOT_FOUND"
            : "BAD_REQUEST",
    });
  }
};
