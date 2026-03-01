import User from "./user.model.js";

/**
 * Repository for User admin operations
 */
class UserRepository {
  /**
   * Find all users with filter, pagination, and sort
   * @param {Object} filter - Mongoose filter object
   * @param {Object} pagination - { page, limit }
   * @param {Object} sort - Mongoose sort object
   * @returns {{ data: User[], total, page, limit, totalPages }}
   */
  async findAll(
    filter = {},
    pagination = { page: 1, limit: 10 },
    sort = { createdAt: -1 },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-hashedPassword")
        .populate("teamId", "name status")
        .skip(skip)
        .limit(limit)
        .sort(sort),
      User.countDocuments(filter),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Find user by ID (exclude password)
   */
  async findById(userId) {
    return await User.findById(userId)
      .select("-hashedPassword")
      .populate("teamId", "name status");
  }

  /**
   * Update user role
   */
  async updateRole(userId, role) {
    return await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true },
    )
      .select("-hashedPassword")
      .populate("teamId", "name status");
  }
}

export const userRepository = new UserRepository();
