import { rescueResponsity } from "./rescue.respository.js";

/**
 * Service for Rescue operations
 */
class RescueService {
  
  /**
   * Get request by ID
   * @param {string} requestId - Request ID
   * @returns {Promise<Object|null>}
   */
  async getAllRequests(filter = {}, pagination = { page: 1, limit: 10 }) {
    return await rescueResponsity.findAllRequests(filter, pagination);
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

  /**
   * Create mission and assign team if status is In Progress
   * @param {string} requestId - Request ID
   * @param {string} status - New status
   * @returns {Promise<Object|null>}
   */
  async createMissionAndAssignTeam(requestId, status) {
    // Implementation for creating mission and assigning team
    const validStatuses = ["In Progress"];
    if(!validStatuses.includes(status)) {
      throw new Error("Status must be 'In Progress' to create mission and assign team");
    }
    return await rescueResponsity.createMissionAndAssignTeam(requestId);
  }
}

const rescueService = new RescueService();

export { rescueService };