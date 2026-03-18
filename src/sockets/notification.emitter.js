import { getIO } from "./socket.server.js";

/**
 * Notification Event Types
 */
export const NOTIFICATION_EVENTS = {
  // Request lifecycle
  REQUEST_SUBMITTED: "REQUEST_SUBMITTED",
  REQUEST_VERIFIED: "REQUEST_VERIFIED",
  REQUEST_REJECTED: "REQUEST_REJECTED",

  // Team application lifecycle
  TEAM_APPLICATION_SUBMITTED: "TEAM_APPLICATION_SUBMITTED",
  TEAM_APPLICATION_APPROVED: "TEAM_APPLICATION_APPROVED",
  TEAM_APPLICATION_REJECTED: "TEAM_APPLICATION_REJECTED",
  TEAM_APPLICATION_WITHDRAWN: "TEAM_APPLICATION_WITHDRAWN",

  // Mission lifecycle
  MISSION_ASSIGNED: "MISSION_ASSIGNED",
  MISSION_ACCEPTED: "MISSION_ACCEPTED",
  MISSION_APPROACHING: "MISSION_APPROACHING",
  MISSION_COMPLETED: "MISSION_COMPLETED",
  MISSION_FAILED: "MISSION_FAILED",
  MISSION_REASSIGNED: "MISSION_REASSIGNED",
  MISSION_WITHDRAWN: "MISSION_WITHDRAWN",

  // General
  NEW_NOTIFICATION: "NEW_NOTIFICATION",
  UNREAD_COUNT_UPDATE: "UNREAD_COUNT_UPDATE",
};

/**
 * Emit notification to a specific user
 * @param {string} userId - Target user ID
 * @param {string} event - Event name
 * @param {Object} data - Notification data
 */
export function emitToUser(userId, event, data) {
  const io = getIO();
  if (!io) {
    console.warn("Socket.io not initialized, cannot emit to user");
    return;
  }

  io.to(`user:${userId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });

  console.log(`📤 Emitted ${event} to user:${userId}`);
}

/**
 * Emit notification to all users with a specific role
 * @param {string} role - Target role (e.g., "COORDINATOR", "TEAM_LEADER")
 * @param {string} event - Event name
 * @param {Object} data - Notification data
 */
export function emitToRole(role, event, data) {
  const io = getIO();
  if (!io) {
    console.warn("Socket.io not initialized, cannot emit to role");
    return;
  }

  io.to(`role:${role}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });

  console.log(`📤 Emitted ${event} to role:${role}`);
}

/**
 * Broadcast notification to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Notification data
 */
export function emitBroadcast(event, data) {
  const io = getIO();
  if (!io) {
    console.warn("Socket.io not initialized, cannot broadcast");
    return;
  }

  io.emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });

  console.log(`📤 Broadcasted ${event} to all clients`);
}

/**
 * Emit unread notification count to a specific user
 * @param {string} userId - Target user ID
 * @param {number} count - Unread notification count
 */
export function emitUnreadCount(userId, count) {
  emitToUser(userId, NOTIFICATION_EVENTS.UNREAD_COUNT_UPDATE, {
    unreadCount: count,
  });
}
