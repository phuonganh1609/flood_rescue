import NotifyModel from "./notify.model.js";

/**
 * Service for Notification operations
 */
class NotificationService {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.userId - User ID
   * @param {string} notificationData.role - User role
   * @param {string} notificationData.requestId - Request ID
   * @param {string} notificationData.type - Notification type
   * @param {string} notificationData.message - Notification message
   * @returns {Promise<Object>}
   */
  async create(notificationData) {
    try {
      const notification = new NotifyModel(notificationData);
      const savedNotification = await notification.save();
      return {
        message: "Notification created successfully",
        data: savedNotification,
      };
    } catch (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Get notifications for a specific user
   * @param {string} userId - User ID
   * @param {Object} pagination - Pagination info
   * @param {number} pagination.page - Page number
   * @param {number} pagination.limit - Items per page
   * @param {Object} [filters] - Optional filters
   * @param {boolean} [filters.isRead] - Filter by read status
   * @param {string} [filters.type] - Filter by notification type
   * @param {Object} [sort] - Sort options
   * @param {'asc'|'desc'} [sort.sortOrder='desc'] - Sort direction by createdAt
   * @returns {Promise<Object>}
   */
  async getNotificationsByUser(
    userId,
    pagination = { page: 1, limit: 10 },
    filters = {},
    sort = {}
  ) {
    try {
      const query = { userId };

      // Filter: isRead (only apply when explicitly passed)
      if (filters.isRead !== undefined) {
        query.isRead = filters.isRead;
      }

      // Filter: type
      if (filters.type) {
        query.type = filters.type;
      }

      // Sort direction
      const sortDirection = sort.sortOrder === "asc" ? 1 : -1;

      const skip = (pagination.page - 1) * pagination.limit;
      const notifications = await NotifyModel.find(query)
        .sort({ createdAt: sortDirection })
        .skip(skip)
        .limit(pagination.limit)
        .populate("userId", "displayName email")
        .populate("requestId", "type incidentType")
        .populate("teamApplicationId", "status motivation submittedPhoneNumber");

      const total = await NotifyModel.countDocuments(query);

      return {
        data: notifications,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch notifications: ${error.message}`
      );
    }
  }

  /**
   * Get a single notification by ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object|null>}
   */
  async getNotificationById(notificationId) {
    try {
      return await NotifyModel.findById(notificationId)
        .populate("userId", "displayName email")
        .populate("requestId", "type incidentType")
        .populate("teamApplicationId", "status motivation submittedPhoneNumber");
    } catch (error) {
      throw new Error(`Failed to fetch notification: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object|null>}
   */
  async markAsRead(notificationId) {
    try {
      return await NotifyModel.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to update notification: ${error.message}`);
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object|null>}
   */
  async deleteNotification(notificationId) {
    try {
      return await NotifyModel.findByIdAndDelete(notificationId);
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Delete all notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async deleteAllNotificationsByUser(userId) {
    try {
      const result = await NotifyModel.deleteMany({ userId });
      return {
        message: `${result.deletedCount} notifications deleted`,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      throw new Error(`Failed to delete notifications: ${error.message}`);
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  async getUnreadCount(userId) {
    try {
      const count = await NotifyModel.countDocuments({
        userId,
        isRead: false,
      });
      return count;
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async markAllAsRead(userId) {
    try {
      const result = await NotifyModel.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );
      return {
        message: `${result.modifiedCount} notifications marked as read`,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      throw new Error(`Failed to mark all as read: ${error.message}`);
    }
  }
}

const notificationService = new NotificationService();

export { notificationService };
