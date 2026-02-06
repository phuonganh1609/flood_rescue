import { notificationService } from './notification.service.js';

/**
 * Create a new notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createNotification = async (req, res) => {
  try {
    const notificationData = req.body;
    const result = await notificationService.create(notificationData);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({ message: error.message });
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
    const result = await notificationService.getNotificationsByUser(userId, pagination);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: error.message });
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
    const notification = await notificationService.getNotificationById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.status(200).json({ data: notification });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return res.status(500).json({ message: error.message });
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
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.status(200).json({ message: 'Notification marked as read', data: result });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ message: error.message });
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
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ message: error.message });
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
    const result = await notificationService.deleteAllNotificationsByUser(userId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return res.status(500).json({ message: error.message });
  }
};