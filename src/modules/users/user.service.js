import { userRepository } from "./user.repository.js";

/**
 * Data scope per role:
 * - null = no restriction (see all users)
 * - array = only see users with these roles
 */
const DATA_SCOPE = {
  Admin: null,
  "Rescue Coordinator": ["Citizen", "Rescue Team"],
};

/**
 * Service for User admin operations
 */
class UserService {

  async createUser(userData, adminId) {
    return await userRepository.createUser(userData);
  };
  /**
   * List users with filters, search, pagination, sort, and role-based data scope
   * @param {Object} query - { role, isActive, search, page, limit, sort, requesterRole }
   * @returns {{ data, total, page, limit, totalPages }}
   */
  async listUsers({ role, isActive, noTeam, search, page = 1, limit = 10, sort, requesterRole }) {
    const filter = {};

    // Apply data scope based on requester's role
    const allowedRoles = DATA_SCOPE[requesterRole];

    if (allowedRoles) {
      if (role) {
        // Intersect: user requested a specific role → only allow if within scope
        if (!allowedRoles.includes(role)) {
          // Requested role is outside scope → return empty result
          return { data: [], total: 0, page, limit, totalPages: 0 };
        }
        filter.role = role;
      } else {
        // No role filter → restrict to scoped roles
        filter.role = { $in: allowedRoles };
      }
    } else if (role) {
      // No scope restriction (Admin) → apply role filter as-is
      filter.role = role;
    }

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Filter by team assignment when requested.
    if (noTeam !== undefined) {
      filter.teamId = noTeam ? null : { $ne: null };
    }

    // Search by displayName, phoneNumber, or email
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      filter.$or = [
        { displayName: searchRegex },
        { phoneNumber: searchRegex },
        { email: searchRegex },
      ];
    }

    // Parse sort
    let sortObj = { createdAt: -1 };
    if (sort) {
      sortObj = sort.split(",").reduce((acc, field) => {
        if (field.startsWith("-")) {
          acc[field.substring(1)] = -1;
        } else {
          acc[field] = 1;
        }
        return acc;
      }, {});
    }

    return await userRepository.findAll(filter, { page, limit }, sortObj);
  }

  /**
   * Update user role
   * @param {string} userId - Target user ID
   * @param {string} role - New role
   * @param {string} adminId - Admin performing the action
   * @returns {Object} Updated user
   */
  async updateUserRole(userId, role, adminId) {
    // Guard: Admin cannot change their own role
    if (userId === adminId) {
      throw new Error("Cannot change your own role");
    }

    // Check target user exists
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if role is actually different
    if (user.role === role) {
      throw new Error(`User already has the role "${role}"`);
    }

    return await userRepository.updateRole(userId, role);
  }
}

export const userService = new UserService();
