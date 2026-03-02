import { notificationService } from "./notification.service.js";
import response from "../../utils/response.js";

/**
 * Create a new notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createNotification = async (req, res) => {
  try {
    const notificationData = req.body;
    const result = await notificationService.create(notificationData);
    return response.sendSuccess(res, {
      data: result,
      statusCode: 201,
      message: "Notification created successfully",
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return response.sendError(res, {
      message: error.message,
      statusCode: 500,
    });
  }
};

/**
 * Get notifications by user ID with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotificationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };
    const result = await notificationService.getNotificationsByUser(
      userId,
      pagination,
    );

    // service returns { data, pagination }
    return response.sendSuccess(res, {
      data: result.data,
      meta: result.pagination,
      message: "Notifications fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return response.sendError(res, {
      message: error.message,
      statusCode: 500,
    });
  }
};

/**
 * Get a single notification by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotificationById = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification =
      await notificationService.getNotificationById(notificationId);
    if (!notification) {
      return response.sendError(res, {
        message: "Notification not found",
        statusCode: 404,
      });
    }
    return response.sendSuccess(res, { data: notification });
  } catch (error) {
    console.error("Error fetching notification:", error);
    return response.sendError(res, {
      message: error.message,
      statusCode: 500,
    });
  }
};

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const result = await notificationService.markAsRead(notificationId);
    if (!result) {
      return response.sendError(res, {
        message: "Notification not found",
        statusCode: 404,
      });
    }
    return response.sendSuccess(res, {
      data: result,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return response.sendError(res, {
      message: error.message,
      statusCode: 500,
    });
  }
};

/**
 * Delete a notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const result = await notificationService.deleteNotification(notificationId);
    if (!result) {
      return response.sendError(res, {
        message: "Notification not found",
        statusCode: 404,
      });
    }
    return response.sendSuccess(res, {
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return response.sendError(res, {
      message: error.message,
      statusCode: 500,
    });
  }
};

/**
 * Get notifications for the currently authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const filters = {};
    if (req.query.isRead !== undefined) {
      filters.isRead = req.query.isRead === "true";
    }
    if (req.query.type) {
      filters.type = req.query.type;
    }

    const sort = {};
    if (req.query.sortOrder) {
      sort.sortOrder = req.query.sortOrder;
    }

    const result = await notificationService.getNotificationsByUser(
      userId,
      pagination,
      filters,
      sort,
    );
    return response.sendSuccess(res, {
      data: result.data,
      meta: result.pagination,
      message: "Notifications fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching my notifications:", error);
    return response.sendError(res, {
      message: error.message,
      statusCode: 500,
    });
  }
};

/**
 * Delete all notifications for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteAllNotificationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result =
      await notificationService.deleteAllNotificationsByUser(userId);
    return response.sendSuccess(res, {
      data: result,
      message: "All notifications deleted",
    });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return response.sendError(res, {
      message: error.message,
      statusCode: 500,
    });
  }
};
