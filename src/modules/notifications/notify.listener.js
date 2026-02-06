import { eventBus } from "../../utils/events.js";
import { notificationService } from "./notification.service.js";
import { authService } from "../auth/auth.service.js";
import {
  emitToUser,
  emitToRole,
  emitUnreadCount,
  NOTIFICATION_EVENTS,
} from "../../sockets/notification.emitter.js";
import NotifyModel from "./notify.model.js";

/**
 * Helper: Get unread count for a user and emit it
 * @param {string} userId
 */
async function emitUnreadCountForUser(userId) {
  try {
    const count = await NotifyModel.countDocuments({ userId, isRead: false });
    emitUnreadCount(userId, count);
  } catch (error) {
    console.error("Error emitting unread count:", error.message);
  }
}

/**
 * REQUEST_SUBMITTED: Citizen submits a rescue request
 * → Notify all Coordinators
 */
eventBus.on("REQUEST_SUBMITTED", async (payload) => {
  try {
    const coordinators =
      await authService.getCurrentUsersByRole("Rescue Coordinator");

    for (const coordinator of coordinators) {
      const userId = coordinator._id || coordinator.id;

      // Save to DB
      const result = await notificationService.create({
        userId,
        role: "COORDINATOR",
        requestId: payload.requestId,
        type: "SUBMITTED",
        message: "🚨 Có yêu cầu cứu hộ mới cần xác minh",
        isRead: false,
      });

      // Emit real-time notification
      emitToUser(userId, NOTIFICATION_EVENTS.NEW_NOTIFICATION, result.data);
      await emitUnreadCountForUser(userId);
    }
  } catch (error) {
    console.error("Error in REQUEST_SUBMITTED listener:", error);
  }
});

/**
 * REQUEST_REJECTED: Coordinator rejects a request
 * → Notify the Citizen who submitted
 */
eventBus.on("REQUEST_REJECTED", async (payload) => {
  try {
    const { requestId, citizenId, reason } = payload;

    const result = await notificationService.create({
      userId: citizenId,
      role: "CITIZEN",
      requestId,
      type: "REJECTED",
      message: `❌ Yêu cầu cứu hộ của bạn đã bị từ chối. Lý do: ${reason || "Không hợp lệ"}`,
      isRead: false,
    });

    emitToUser(citizenId, NOTIFICATION_EVENTS.REQUEST_REJECTED, result.data);
    await emitUnreadCountForUser(citizenId);
  } catch (error) {
    console.error("Error in REQUEST_REJECTED listener:", error);
  }
});

/**
 * REQUEST_VERIFIED: Coordinator accepts a request
 * → Notify the Citizen
 */
eventBus.on("REQUEST_VERIFIED", async (payload) => {
  try {
    const { requestId, citizenId } = payload;

    const result = await notificationService.create({
      userId: citizenId,
      role: "CITIZEN",
      requestId,
      type: "ACCEPTED",
      message: "✅ Yêu cầu cứu hộ của bạn đã được xác nhận hợp lệ",
      isRead: false,
    });

    emitToUser(citizenId, NOTIFICATION_EVENTS.REQUEST_VERIFIED, result.data);
    await emitUnreadCountForUser(citizenId);
  } catch (error) {
    console.error("Error in REQUEST_VERIFIED listener:", error);
  }
});

/**
 * MISSION_ASSIGNED: Coordinator assigns a team to a mission
 * → Notify Citizen (team assigned) and Team Leader (new mission)
 */
eventBus.on("MISSION_ASSIGNED", async (payload) => {
  try {
    const { requestId, missionId, citizenId, teamLeaderId, teamName } = payload;

    // Notify Citizen
    const citizenResult = await notificationService.create({
      userId: citizenId,
      role: "CITIZEN",
      requestId,
      type: "ACCEPTED",
      message: `✅ Đội cứu hộ "${teamName}" đã được phân công đến hỗ trợ bạn`,
      isRead: false,
    });
    emitToUser(
      citizenId,
      NOTIFICATION_EVENTS.MISSION_ASSIGNED,
      citizenResult.data,
    );
    await emitUnreadCountForUser(citizenId);

    // Notify Team Leader
    const teamResult = await notificationService.create({
      userId: teamLeaderId,
      role: "TEAM_LEADER",
      requestId,
      type: "ACCEPTED",
      message: `📋 Bạn có nhiệm vụ cứu hộ mới - Mission #${missionId}`,
      isRead: false,
    });
    emitToUser(
      teamLeaderId,
      NOTIFICATION_EVENTS.MISSION_ASSIGNED,
      teamResult.data,
    );
    await emitUnreadCountForUser(teamLeaderId);
  } catch (error) {
    console.error("Error in MISSION_ASSIGNED listener:", error);
  }
});

/**
 * MISSION_ACCEPTED: Team accepts the mission
 * → Notify Coordinator
 */
eventBus.on("MISSION_ACCEPTED", async (payload) => {
  try {
    const { requestId, missionId, teamName } = payload;

    // Notify all coordinators
    const coordinators =
      await authService.getCurrentUsersByRole("Rescue Coordinator");
    for (const coordinator of coordinators) {
      const userId = coordinator._id || coordinator.id;

      const result = await notificationService.create({
        userId,
        role: "COORDINATOR",
        requestId,
        type: "ONGOING",
        message: `👍 Đội "${teamName}" đã nhận nhiệm vụ #${missionId}`,
        isRead: false,
      });

      emitToUser(userId, NOTIFICATION_EVENTS.MISSION_ACCEPTED, result.data);
      await emitUnreadCountForUser(userId);
    }
  } catch (error) {
    console.error("Error in MISSION_ACCEPTED listener:", error);
  }
});

/**
 * MISSION_APPROACHING: Team is en route
 * → Notify Citizen
 */
eventBus.on("MISSION_APPROACHING", async (payload) => {
  try {
    const { requestId, citizenId, teamName } = payload;

    const result = await notificationService.create({
      userId: citizenId,
      role: "CITIZEN",
      requestId,
      type: "ONGOING",
      message: `🚗 Đội cứu hộ "${teamName}" đang trên đường đến vị trí của bạn`,
      isRead: false,
    });

    emitToUser(citizenId, NOTIFICATION_EVENTS.MISSION_APPROACHING, result.data);
    await emitUnreadCountForUser(citizenId);
  } catch (error) {
    console.error("Error in MISSION_APPROACHING listener:", error);
  }
});

/**
 * MISSION_COMPLETED: Rescue successful
 * → Notify Citizen and Coordinator
 */
eventBus.on("MISSION_COMPLETED", async (payload) => {
  try {
    const { requestId, missionId, citizenId } = payload;

    // Notify Citizen
    const citizenResult = await notificationService.create({
      userId: citizenId,
      role: "CITIZEN",
      requestId,
      type: "COMPLETED",
      message: "🎉 Cứu hộ thành công! Cảm ơn bạn đã sử dụng dịch vụ",
      isRead: false,
    });
    emitToUser(
      citizenId,
      NOTIFICATION_EVENTS.MISSION_COMPLETED,
      citizenResult.data,
    );
    await emitUnreadCountForUser(citizenId);

    // Notify Coordinators
    const coordinators =
      await authService.getCurrentUsersByRole("Rescue Coordinator");
    for (const coordinator of coordinators) {
      const userId = coordinator._id || coordinator.id;

      const result = await notificationService.create({
        userId,
        role: "COORDINATOR",
        requestId,
        type: "COMPLETED",
        message: `✅ Nhiệm vụ #${missionId} hoàn thành thành công`,
        isRead: false,
      });

      emitToUser(userId, NOTIFICATION_EVENTS.MISSION_COMPLETED, result.data);
      await emitUnreadCountForUser(userId);
    }
  } catch (error) {
    console.error("Error in MISSION_COMPLETED listener:", error);
  }
});

/**
 * MISSION_FAILED: Rescue failed
 * → Notify Citizen and Coordinator
 */
eventBus.on("MISSION_FAILED", async (payload) => {
  try {
    const { requestId, missionId, citizenId, reason } = payload;

    // Notify Citizen
    const citizenResult = await notificationService.create({
      userId: citizenId,
      role: "CITIZEN",
      requestId,
      type: "CANCELLED",
      message: `⚠️ Cứu hộ không thành công. ${reason ? `Lý do: ${reason}` : "Đang chờ phân công đội khác"}`,
      isRead: false,
    });
    emitToUser(
      citizenId,
      NOTIFICATION_EVENTS.MISSION_FAILED,
      citizenResult.data,
    );
    await emitUnreadCountForUser(citizenId);

    // Notify Coordinators
    const coordinators =
      await authService.getCurrentUsersByRole("Rescue Coordinator");
    for (const coordinator of coordinators) {
      const userId = coordinator._id || coordinator.id;

      const result = await notificationService.create({
        userId,
        role: "COORDINATOR",
        requestId,
        type: "CANCELLED",
        message: `❌ Nhiệm vụ #${missionId} thất bại - cần phân công lại`,
        isRead: false,
      });

      emitToUser(userId, NOTIFICATION_EVENTS.MISSION_FAILED, result.data);
      await emitUnreadCountForUser(userId);
    }
  } catch (error) {
    console.error("Error in MISSION_FAILED listener:", error);
  }
});

/**
 * MISSION_REASSIGNED: Mission reassigned to a new team
 * → Notify new Team Leader
 */
eventBus.on("MISSION_REASSIGNED", async (payload) => {
  try {
    const { requestId, missionId, newTeamLeaderId, teamName } = payload;

    const result = await notificationService.create({
      userId: newTeamLeaderId,
      role: "TEAM_LEADER",
      requestId,
      type: "ACCEPTED",
      message: `🔄 Nhiệm vụ #${missionId} đã được chuyển cho đội bạn`,
      isRead: false,
    });

    emitToUser(
      newTeamLeaderId,
      NOTIFICATION_EVENTS.MISSION_REASSIGNED,
      result.data,
    );
    await emitUnreadCountForUser(newTeamLeaderId);
  } catch (error) {
    console.error("Error in MISSION_REASSIGNED listener:", error);
  }
});

console.log("✅ Notification event listeners initialized");
