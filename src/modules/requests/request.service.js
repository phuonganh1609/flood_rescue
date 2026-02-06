import { authRepository } from "../auth/auth.repository.js";
import { requestRepository } from "./request.repository.js";
import { eventBus } from "../../utils/events.js";

/**
 * Service for Request operations
 */
class RequestService {
  /**
   * Create a new request
   * @param {string} userId - User ID
   * @param {Object} requestData - Request data
   * @param {Array} files - Uploaded files
   * @returns {Promise<Object>}
   */
  async createRequest(userId, requestData) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new Error("User does not exist");

    const {
      type,
      incidentType,
      latitude,
      longitude,
      description,
      peopleCount,
      requestSupply,
      imageUrls,
    } = requestData;

    // Map imageUrls to requestMedia format
    const requestMedia = (imageUrls || []).map((url) => ({
      imageUrl: url,
      uploadedAt: new Date(),
    }));

    const newRequest = await requestRepository.createRequest({
      userId,
      userName: user.displayName || user.userName,
      type,
      incidentType: incidentType || "Other",
      latitude,
      longitude,
      description,
      peopleCount: peopleCount || 1,
      requestSupply: requestSupply || [],
      requestMedia,
    });

    // Emit event to notify coordinators
    eventBus.emit("REQUEST_SUBMITTED", {
      requestId: newRequest._id,
      userId,
    });
    return {
      message: "Request created successfully",
      data: newRequest,
    };
  }

  /**
   * Get request by ID
   * @param {string} requestId - Request ID
   * @returns {Promise<Object|null>}
   */
  async getRequestById(requestId) {
    return await requestRepository.findRequestById(requestId);
  }

  /**
   * Get all requests with pagination
   * @param {Object} filter - Filter criteria
   * @param {Object} pagination - Pagination info
   * @returns {Promise<Object>}
   */
  async getAllRequests(filter = {}, pagination = { page: 1, limit: 10 }) {
    return await requestRepository.findAllRequests(filter, pagination);
  }

  /**
   * Get requests created by specific user
   * @param {string} userId
   * @param {{page:number,limit:number}} pagination
   */
  async getRequestsByUser(
    userId,
    filter = {},
    pagination = { page: 1, limit: 10 },
  ) {
    return await requestRepository.findRequestsByUser(
      userId,
      filter,
      pagination,
    );
  }

  /**
   * Update request status with state machine validation
   * @param {string} requestId - Request ID
   * @param {string} newStatus - New status
   * @param {string} [reason] - Reason for rejection/cancellation
   * @returns {Promise<Object|null>}
   *
   * State transitions allowed:
   * - Submitted → Accepted | Rejected
   * - Accepted → In Progress (via mission assignment, but can be set manually)
   * - In Progress → Completed | Cancelled
   * - No backward transitions allowed
   */
  async updateRequestStatus(requestId, newStatus, reason = null) {
    const validStatuses = [
      "Submitted",
      "Accepted",
      "Rejected",
      "In Progress",
      "Completed",
      "Cancelled",
    ];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Get current request to validate transition
    const request = await requestRepository.findRequestById(requestId);
    if (!request) {
      return null;
    }

    const currentStatus = request.status;

    // Define allowed transitions
    const allowedTransitions = {
      Submitted: ["Accepted", "Rejected"],
      Accepted: ["In Progress"],
      "In Progress": ["Completed", "Cancelled"],
      // Terminal states - no transitions allowed
      Rejected: [],
      Completed: [],
      Cancelled: [],
    };

    // Validate transition
    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedTransitions[currentStatus]?.join(", ") || "none"}`,
      );
    }

    // Update status in DB
    const updatedRequest = await requestRepository.updateRequestStatus(
      requestId,
      newStatus,
    );

    // Emit events based on status change
    if (updatedRequest) {
      const citizenId = request.userId.toString();

      switch (newStatus) {
        case "Accepted":
          eventBus.emit("REQUEST_VERIFIED", {
            requestId,
            citizenId,
          });
          break;

        case "Rejected":
          eventBus.emit("REQUEST_REJECTED", {
            requestId,
            citizenId,
            reason: reason || "Yêu cầu không hợp lệ hoặc sai thông tin",
          });
          break;

        case "In Progress":
          // Typically set by system when mission is assigned
          // MISSION_ASSIGNED event will be emitted from missions module
          break;

        case "Completed":
          eventBus.emit("MISSION_COMPLETED", {
            requestId,
            citizenId,
            missionId: requestId, // Temporary until missions module exists
          });
          break;

        case "Cancelled":
          eventBus.emit("MISSION_FAILED", {
            requestId,
            citizenId,
            missionId: requestId,
            reason: reason || "Không thể hoàn thành nhiệm vụ",
          });
          break;
      }
    }

    return updatedRequest;
  }
}

const requestService = new RequestService();

export { requestService };
