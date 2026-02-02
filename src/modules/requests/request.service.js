import { authRepository } from "../auth/auth.repository.js";
import { requestRepository } from "./request.repository.js";

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
    pagination = { page: 1, limit: 10 }
  ) {
    return await requestRepository.findRequestsByUser(
      userId,
      filter,
      pagination
    );
  }

  /**
   * Update request status
   * @param {string} requestId - Request ID
   * @param {string} status - New status
   * @returns {Promise<Object|null>}
   */
  async updateRequestStatus(requestId, status) {
    const validStatuses = ["Pending", "In Progress", "Completed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }
    return await requestRepository.updateRequestStatus(requestId, status);
  }
}

const requestService = new RequestService();

export { requestService };