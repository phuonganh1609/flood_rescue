import { authRepository } from "../auth/auth.repository.js";
import { requestRepository } from "./request.repository.js";
import { uploadFileForUser } from "../../middlewares/uploadMidleware.js";

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
  async createRequest(userId, requestData, files) {
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
      media,
    } = requestData;

    // Xử lý media - convert string thành array nếu cần
    let mediaArray = [];
    if (media) {
      mediaArray = Array.isArray(media) ? media : [media];
    }

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
      requestMedia: mediaArray,
    });

    const uploadedFiles = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const media = await uploadFileForUser({
          userId,
          scope: "requests",
          refId: newRequest._id,
          file,
        });

        uploadedFiles.push(media);
      }

      // Update request with media files
      const updatedRequest = await requestRepository.updateRequest(
        newRequest._id,
        { requestMedia: uploadedFiles }
      );

      return {
        message: "Request created successfully",
        data: updatedRequest,
      };
    }

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