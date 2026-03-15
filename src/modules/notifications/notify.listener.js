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

async function getReviewerUsers() {
  const [coordinators, admins] = await Promise.all([
    authService.getCurrentUsersByRole("Rescue Coordinator"),
    authService.getCurrentUsersByRole("Admin"),
  ]);

  return [...coordinators, ...admins];
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
 * TEAM_APPLICATION_SUBMITTED: Citizen submits application to become Rescue Team
 * → Notify all Coordinators and Admins
 */
eventBus.on("TEAM_APPLICATION_SUBMITTED", async (payload) => {
  try {
    const reviewers = await getReviewerUsers();

    for (const reviewer of reviewers) {
      const userId = reviewer._id || reviewer.id;
      const role = reviewer.role === "Admin" ? "ADMIN" : "COORDINATOR";

      const result = await notificationService.create({
        userId,
        role,
        teamApplicationId: payload.applicationId,
        type: "SUBMITTED",
        message: `📝 ${payload.citizenName} vừa nộp đơn ứng tuyển Rescue Team`,
        isRead: false,
      });

      emitToUser(
        userId,
        NOTIFICATION_EVENTS.TEAM_APPLICATION_SUBMITTED,
        result.data,
      );
      await emitUnreadCountForUser(userId);
    }
  } catch (error) {
    console.error("Error in TEAM_APPLICATION_SUBMITTED listener:", error);
  }
});

/**
 * TEAM_APPLICATION_APPROVED → Notify applicant
 */
eventBus.on("TEAM_APPLICATION_APPROVED", async (payload) => {
  try {
    const result = await notificationService.create({
      userId: payload.citizenId,
      role: "CITIZEN",
      teamApplicationId: payload.applicationId,
      type: "ACCEPTED",
      message: "✅ Đơn ứng tuyển Rescue Team của bạn đã được phê duyệt",
      isRead: false,
    });

    emitToUser(
      payload.citizenId,
      NOTIFICATION_EVENTS.TEAM_APPLICATION_APPROVED,
      result.data,
    );
    await emitUnreadCountForUser(payload.citizenId);
  } catch (error) {
    console.error("Error in TEAM_APPLICATION_APPROVED listener:", error);
  }
});

/**
 * TEAM_APPLICATION_REJECTED → Notify applicant
 */
eventBus.on("TEAM_APPLICATION_REJECTED", async (payload) => {
  try {
    const result = await notificationService.create({
      userId: payload.citizenId,
      role: "CITIZEN",
      teamApplicationId: payload.applicationId,
      type: "REJECTED",
      message: `❌ Đơn ứng tuyển Rescue Team của bạn đã bị từ chối${payload.reason ? `. Lý do: ${payload.reason}` : ""}`,
      isRead: false,
    });

    emitToUser(
      payload.citizenId,
      NOTIFICATION_EVENTS.TEAM_APPLICATION_REJECTED,
      result.data,
    );
    await emitUnreadCountForUser(payload.citizenId);
  } catch (error) {
    console.error("Error in TEAM_APPLICATION_REJECTED listener:", error);
  }
});

/**
 * TEAM_APPLICATION_WITHDRAWN → Notify Coordinators/Admins
 */
eventBus.on("TEAM_APPLICATION_WITHDRAWN", async (payload) => {
  try {
    const reviewers = await getReviewerUsers();

    for (const reviewer of reviewers) {
      const userId = reviewer._id || reviewer.id;
      const role = reviewer.role === "Admin" ? "ADMIN" : "COORDINATOR";

      const result = await notificationService.create({
        userId,
        role,
        teamApplicationId: payload.applicationId,
        type: "WITHDRAWN",
        message: `↩️ ${payload.citizenName} đã rút đơn ứng tuyển Rescue Team`,
        isRead: false,
      });

      emitToUser(
        userId,
        NOTIFICATION_EVENTS.TEAM_APPLICATION_WITHDRAWN,
        result.data,
      );
      await emitUnreadCountForUser(userId);
    }
  } catch (error) {
    console.error("Error in TEAM_APPLICATION_WITHDRAWN listener:", error);
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
    if (citizenId) {
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
    }

    // Notify Team Leader
    if (teamLeaderId) {
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
    }
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
    if (!citizenId) return;

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
    if (citizenId) {
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
    }

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
    if (citizenId) {
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
    }

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
 * MISSION_ABORTED: Coordinator aborts an in-progress mission
 * -> Notify affected Citizens, Team Leaders, and Coordinators
 */
eventBus.on("MISSION_ABORTED", async (payload) => {
  try {
    const {
      requestIds = [],
      missionId,
      missionCode,
      citizenIds = [],
      teamLeaderIds = [],
      teamNames = [],
    } = payload;

    const primaryRequestId = requestIds[0] || null;
    const teamNameText = teamNames.length > 0 ? ` Các đội bị ảnh hưởng: ${teamNames.join(", ")}.` : "";
    const missionLabel = missionCode || missionId;

    for (const citizenId of citizenIds) {
      const citizenResult = await notificationService.create({
        userId: citizenId,
        role: "CITIZEN",
        requestId: primaryRequestId,
        missionId,
        type: "CANCELLED",
        message: `⚠️ Nhiệm vụ hỗ trợ của bạn đã bị huỷ bởi điều phối viên. Chúng tôi sẽ cập nhật phương án mới sớm nhất.${teamNameText}`,
        isRead: false,
      });

      emitToUser(citizenId, NOTIFICATION_EVENTS.MISSION_ABORTED, citizenResult.data);
      await emitUnreadCountForUser(citizenId);
    }

    for (const teamLeaderId of teamLeaderIds) {
      const teamResult = await notificationService.create({
        userId: teamLeaderId,
        role: "TEAM_LEADER",
        requestId: primaryRequestId,
        missionId,
        type: "CANCELLED",
        message: `🛑 Nhiệm vụ #${missionLabel} đã bị điều phối viên huỷ. Vui lòng dừng thực thi và chờ điều động tiếp theo.`,
        isRead: false,
      });

      emitToUser(teamLeaderId, NOTIFICATION_EVENTS.MISSION_ABORTED, teamResult.data);
      await emitUnreadCountForUser(teamLeaderId);
    }

    const coordinators = await authService.getCurrentUsersByRole("Rescue Coordinator");
    for (const coordinator of coordinators) {
      const userId = coordinator._id || coordinator.id;

      const result = await notificationService.create({
        userId,
        role: "COORDINATOR",
        requestId: primaryRequestId,
        missionId,
        type: "CANCELLED",
        message: `🛑 Nhiệm vụ #${missionLabel} đã được abort.${teamNameText}`,
        isRead: false,
      });

      emitToUser(userId, NOTIFICATION_EVENTS.MISSION_ABORTED, result.data);
      await emitUnreadCountForUser(userId);
    }
  } catch (error) {
    console.error("Error in MISSION_ABORTED listener:", error);
  }
});

/**
 * MISSION_WITHDRAWN: Team rejects / withdraws from a mission
 * → Notify all Coordinators to reassign
 */
eventBus.on("MISSION_WITHDRAWN", async (payload) => {
  try {
    const { requestId, missionId, teamName, withdrawalReason } = payload;

    const coordinators =
      await authService.getCurrentUsersByRole("Rescue Coordinator");
    for (const coordinator of coordinators) {
      const userId = coordinator._id || coordinator.id;

      const result = await notificationService.create({
        userId,
        role: "COORDINATOR",
        requestId,
        missionId,
        type: "WITHDRAWN",
        message: `⚠️ Đội "${teamName}" đã từ chối nhiệm vụ - cần phân công lại${withdrawalReason ? ` (Lý do: ${withdrawalReason})` : ""}`,
        isRead: false,
      });

      emitToUser(userId, NOTIFICATION_EVENTS.MISSION_WITHDRAWN, result.data);
      await emitUnreadCountForUser(userId);
    }
  } catch (error) {
    console.error("Error in MISSION_WITHDRAWN listener:", error);
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
